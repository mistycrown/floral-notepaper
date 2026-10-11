//! Enumerate installed font families without reading or copying font files.
use std::collections::BTreeSet;

pub fn list_font_families() -> Result<Vec<String>, String> {
    let fonts = platform_fonts()?;
    let families: BTreeSet<_> = fonts
        .into_iter()
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty() && !name.starts_with('@'))
        .collect();
    Ok(families.into_iter().collect())
}

#[cfg(target_os = "windows")]
fn platform_fonts() -> Result<Vec<String>, String> {
    use std::ffi::c_void;
    // LOGFONTW is the first member of the ENUMLOGFONTEXW callback record.
    #[repr(C)]
    struct LogFont {
        height: i32,
        width: i32,
        escapement: i32,
        orientation: i32,
        weight: i32,
        italic: u8,
        underline: u8,
        strike_out: u8,
        char_set: u8,
        out_precision: u8,
        clip_precision: u8,
        quality: u8,
        pitch_and_family: u8,
        face_name: [u16; 32],
    }
    #[link(name = "user32")]
    extern "system" {
        fn GetDC(window: *mut c_void) -> *mut c_void;
        fn ReleaseDC(window: *mut c_void, dc: *mut c_void) -> i32;
    }
    #[link(name = "gdi32")]
    extern "system" {
        fn EnumFontFamiliesExW(
            dc: *mut c_void,
            font: *const LogFont,
            callback: Option<
                unsafe extern "system" fn(*const LogFont, *const c_void, u32, isize) -> i32,
            >,
            context: isize,
            flags: u32,
        ) -> i32;
    }
    unsafe extern "system" fn collect(
        font: *const LogFont,
        _metrics: *const c_void,
        _kind: u32,
        context: isize,
    ) -> i32 {
        // The synchronous GDI callback receives valid records and the vector
        // remains alive until EnumFontFamiliesExW returns.
        let face = &(*font).face_name;
        let length = face.iter().position(|&ch| ch == 0).unwrap_or(face.len());
        if let Ok(name) = String::from_utf16(&face[..length]) {
            (*(context as *mut Vec<String>)).push(name);
        }
        1
    }
    unsafe {
        let dc = GetDC(std::ptr::null_mut());
        if dc.is_null() {
            return Err("Could not access the system font collection".into());
        }
        let mut font: LogFont = std::mem::zeroed();
        font.char_set = 1; // DEFAULT_CHARSET: enumerate all installed families.
        let mut families = Vec::new();
        EnumFontFamiliesExW(
            dc,
            &font,
            Some(collect),
            &mut families as *mut Vec<String> as isize,
            0,
        );
        ReleaseDC(std::ptr::null_mut(), dc);
        Ok(families)
    }
}

#[cfg(target_os = "macos")]
fn platform_fonts() -> Result<Vec<String>, String> {
    let output = std::process::Command::new("osascript")
        .args(["-l", "JavaScript", "-e", "ObjC.import('AppKit'); JSON.stringify(ObjC.deepUnwrap($.NSFontManager.sharedFontManager.availableFontFamilies))"])
        .output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn platform_fonts() -> Result<Vec<String>, String> {
    let output = std::process::Command::new("fc-list")
        .args(["--format", "%{family}\n"])
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .flat_map(|line| line.split(','))
        .map(str::to_string)
        .collect())
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    #[test]
    fn enumerates_installed_families() {
        let families = super::list_font_families().expect("enumerate native fonts");
        assert!(!families.is_empty());
        assert!(families.windows(2).all(|pair| pair[0] < pair[1]));
        assert!(families.iter().any(|name| name == "Segoe UI"));
        assert!(families.iter().all(|name| !name.contains('\u{fffd}')));
        assert!(families.iter().all(|name| !name.starts_with('@')));
    }
}
