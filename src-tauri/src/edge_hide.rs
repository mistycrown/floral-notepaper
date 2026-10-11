//! Native edge-hide controller for pinned note surfaces.
use crate::edge_hide_geometry::{Controller, Display, Rect};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager, PhysicalPosition, State, WebviewWindow};

#[derive(Default)]
struct Entry {
    controller: Controller,
    suspended: bool,
}

pub struct EdgeHideState {
    windows: Mutex<HashMap<String, Entry>>,
    started: Instant,
    stopped: AtomicBool,
    pending: AtomicBool,
}

impl Default for EdgeHideState {
    fn default() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
            started: Instant::now(),
            stopped: AtomicBool::new(false),
            pending: AtomicBool::new(false),
        }
    }
}

fn bounds(window: &WebviewWindow) -> tauri::Result<Rect> {
    let pos = window.outer_position()?;
    let size = window.outer_size()?;
    Ok(Rect {
        x: pos.x,
        y: pos.y,
        width: size.width as i32,
        height: size.height as i32,
    })
}

fn display(monitor: &tauri::Monitor) -> Display {
    let pos = monitor.position();
    let size = monitor.size();
    let work = monitor.work_area();
    Display {
        screen: Rect {
            x: pos.x,
            y: pos.y,
            width: size.width as i32,
            height: size.height as i32,
        },
        work: Rect {
            x: work.position.x,
            y: work.position.y,
            width: work.size.width as i32,
            height: work.size.height as i32,
        },
        scale: monitor.scale_factor(),
    }
}

#[tauri::command]
pub fn set_tile_edge_hide(
    window: WebviewWindow,
    state: State<'_, EdgeHideState>,
    enabled: bool,
    suspended: bool,
) -> Result<(), String> {
    if !window.label().starts_with("tile-") && !window.label().starts_with("notepad-") {
        return Err("Edge hiding is only supported for note surfaces".into());
    }
    let mut entries = state.windows.lock().map_err(|e| e.to_string())?;
    if enabled {
        entries
            .entry(window.label().to_owned())
            .or_default()
            .suspended = suspended;
    } else if let Some(entry) = entries.get_mut(window.label()) {
        let actual = bounds(&window).map_err(|e| e.to_string())?;
        // Only forget the expanded position after a successful native restoration.
        let mut controller = entry.controller.clone();
        if let Some(rect) = controller.restore(actual) {
            window
                .set_position(PhysicalPosition::new(rect.x, rect.y))
                .map_err(|e| e.to_string())?;
        }
        entries.remove(window.label());
    }
    Ok(())
}

pub fn remove(app: &AppHandle, label: &str) {
    if let Some(state) = app.try_state::<EdgeHideState>() {
        if let Ok(mut entries) = state.windows.lock() {
            entries.remove(label);
        }
    }
}

pub fn stop(app: &AppHandle) {
    app.state::<EdgeHideState>()
        .stopped
        .store(true, Ordering::Relaxed);
}

pub fn start(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(100));
        let state = app.state::<EdgeHideState>();
        if state.stopped.load(Ordering::Relaxed) {
            break;
        }
        let active = state
            .windows
            .lock()
            .map(|entries| !entries.is_empty())
            .unwrap_or(false);
        if !active || state.pending.swap(true, Ordering::Relaxed) {
            continue;
        }
        let handle = app.clone();
        if app
            .run_on_main_thread(move || {
                tick(&handle);
                handle
                    .state::<EdgeHideState>()
                    .pending
                    .store(false, Ordering::Relaxed);
            })
            .is_err()
        {
            state.pending.store(false, Ordering::Relaxed);
            break;
        }
    });
}

fn tick(app: &AppHandle) {
    let state = app.state::<EdgeHideState>();
    let Ok(monitors) = app.available_monitors() else {
        return;
    };
    let Ok(cursor) = app.cursor_position() else {
        return;
    };
    let displays: Vec<_> = monitors.iter().map(display).collect();
    let Ok(mut entries) = state.windows.lock() else {
        return;
    };
    entries.retain(|label, entry| {
        let Some(window) = app.get_webview_window(label) else {
            return false;
        };
        if !window.is_visible().unwrap_or(false) || window.is_minimized().unwrap_or(true) {
            return true;
        }
        let Ok(actual) = bounds(&window) else {
            return true;
        };
        let monitor = window.current_monitor().ok().flatten();
        let Some(current) = monitor.as_ref().or(monitors.first()) else {
            return true;
        };
        let mut controller = entry.controller.clone();
        if let Some(rect) = controller.step(
            actual,
            display(current),
            &displays,
            (cursor.x.round() as i32, cursor.y.round() as i32),
            entry.suspended || mouse_button_down(),
            state.started.elapsed().as_millis() as u64,
        ) {
            // Moving off-screen keeps the native strip available for hover and avoids focus theft.
            if window
                .set_position(PhysicalPosition::new(rect.x, rect.y))
                .is_err()
            {
                return true;
            }
        }
        entry.controller = controller;
        true
    });
}

#[cfg(target_os = "windows")]
fn mouse_button_down() -> bool {
    #[link(name = "user32")]
    extern "system" {
        fn GetAsyncKeyState(key: i32) -> i16;
    }
    [0x01, 0x02, 0x04, 0x05, 0x06]
        .into_iter()
        .any(|key| unsafe { GetAsyncKeyState(key) < 0 })
}

#[cfg(not(target_os = "windows"))]
fn mouse_button_down() -> bool {
    false
}
