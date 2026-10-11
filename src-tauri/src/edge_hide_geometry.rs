//! Docked note geometry in physical pixels. No platform or UI dependencies.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl Rect {
    fn right(self) -> i32 {
        self.x + self.width
    }
    fn bottom(self) -> i32 {
        self.y + self.height
    }
    fn contains(self, (x, y): (i32, i32)) -> bool {
        x >= self.x && x < self.right() && y >= self.y && y < self.bottom()
    }
    fn intersects(self, other: Self) -> bool {
        self.x < other.right()
            && self.right() > other.x
            && self.y < other.bottom()
            && self.bottom() > other.y
    }
    fn clamp_to(self, area: Self) -> Self {
        Self {
            x: self
                .x
                .clamp(area.x, area.right() - self.width.min(area.width)),
            y: self
                .y
                .clamp(area.y, area.bottom() - self.height.min(area.height)),
            ..self
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Display {
    pub screen: Rect,
    pub work: Rect,
    pub scale: f64,
}

#[derive(Clone, Copy, Debug)]
struct Dock {
    expanded: Rect,
    collapsed: Rect,
    display: Display,
    hidden: bool,
}

#[derive(Clone, Debug, Default)]
pub struct Controller {
    dock: Option<Dock>,
    outside_since: Option<u64>,
}

impl Controller {
    pub fn restore(&mut self, actual: Rect) -> Option<Rect> {
        self.outside_since = None;
        self.dock
            .take()
            .filter(|dock| dock.hidden && actual == dock.collapsed)
            .map(|dock| dock.expanded)
    }

    pub fn step(
        &mut self,
        actual: Rect,
        display: Display,
        displays: &[Display],
        cursor: (i32, i32),
        blocked: bool,
        now_ms: u64,
    ) -> Option<Rect> {
        if let Some(dock) = self.dock {
            let expected = if dock.hidden {
                dock.collapsed
            } else {
                dock.expanded
            };
            if actual != expected {
                // A user drag or resize owns the new bounds; never restore stale coordinates.
                self.dock = None;
                self.outside_since = None;
            } else if !displays.contains(&dock.display)
                || displays.iter().any(|other| {
                    other.screen != dock.display.screen && dock.collapsed.intersects(other.screen)
                })
            {
                self.dock = None;
                self.outside_since = None;
                return Some(dock.expanded.clamp_to(display.work));
            }
        }

        if self.dock.is_none() {
            if blocked {
                return None;
            }
            self.dock = find_dock(actual, display, displays);
        }
        let dock = self.dock.as_mut()?;
        let hovered = if dock.hidden {
            dock.collapsed.contains(cursor) && dock.display.screen.contains(cursor)
        } else {
            dock.expanded.contains(cursor) || actual.contains(cursor)
        };

        if hovered || blocked {
            self.outside_since = None;
            if dock.hidden && hovered {
                dock.hidden = false;
                return Some(dock.expanded);
            }
        } else {
            let since = *self.outside_since.get_or_insert(now_ms);
            if !dock.hidden && now_ms.saturating_sub(since) >= 600 {
                dock.hidden = true;
                return Some(dock.collapsed);
            }
        }
        let expected = if dock.hidden {
            dock.collapsed
        } else {
            dock.expanded
        };
        (actual != expected).then_some(expected)
    }
}

fn find_dock(actual: Rect, display: Display, displays: &[Display]) -> Option<Dock> {
    let area = display.work;
    if actual.width >= area.width || actual.height >= area.height {
        return None;
    }
    let threshold = (12.0 * display.scale).round() as i32;
    let strip = (6.0 * display.scale).round().max(1.0) as i32;
    let clamped = actual.clamp_to(area);
    let mut candidates = [
        (
            (actual.x - area.x).abs(),
            Rect {
                x: area.x,
                ..clamped
            },
            Rect {
                x: area.x - actual.width + strip,
                ..clamped
            },
        ),
        (
            (actual.right() - area.right()).abs(),
            Rect {
                x: area.right() - actual.width,
                ..clamped
            },
            Rect {
                x: area.right() - strip,
                ..clamped
            },
        ),
        (
            (actual.y - area.y).abs(),
            Rect {
                y: area.y,
                ..clamped
            },
            Rect {
                y: area.y - actual.height + strip,
                ..clamped
            },
        ),
    ];
    candidates.sort_by_key(|candidate| candidate.0);
    candidates
        .into_iter()
        .find(|(distance, _, collapsed)| {
            *distance <= threshold
                && !displays.iter().any(|other| {
                    other.screen != display.screen && collapsed.intersects(other.screen)
                })
        })
        .map(|(_, expanded, collapsed)| Dock {
            expanded,
            collapsed,
            display,
            hidden: false,
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn rect(x: i32, y: i32, width: i32, height: i32) -> Rect {
        Rect {
            x,
            y,
            width,
            height,
        }
    }
    fn display(x: i32, scale: f64) -> Display {
        Display {
            screen: rect(x, 0, 1920, 1080),
            work: rect(x, 0, 1920, 1040),
            scale,
        }
    }
    #[test]
    fn hides_after_delay_and_reveals_without_changing_size() {
        let d = display(0, 1.0);
        let shown = rect(0, 100, 260, 260);
        let hidden = rect(-254, 100, 260, 260);
        let mut c = Controller::default();
        assert_eq!(c.step(shown, d, &[d], (800, 400), false, 0), None);
        assert_eq!(c.step(shown, d, &[d], (800, 400), false, 599), None);
        assert_eq!(c.step(shown, d, &[d], (800, 400), false, 600), Some(hidden));
        assert_eq!(c.step(hidden, d, &[d], (3, 150), false, 700), Some(shown));
        assert_eq!(c.step(shown, d, &[d], (800, 400), false, 800), None);
        assert_eq!(
            c.step(shown, d, &[d], (800, 400), false, 1400),
            Some(hidden)
        );
        assert_eq!(c.restore(hidden), Some(shown));
        assert_eq!(c.restore(shown), None);
    }
    #[test]
    fn handles_negative_origins_and_scaled_right_and_top_edges() {
        let d = display(-1920, 1.5);
        let mut c = Controller::default();
        let actual = rect(-270, 100, 260, 260);
        let shown = rect(-260, 100, 260, 260);
        assert_eq!(c.step(actual, d, &[d], (-800, 500), false, 0), Some(shown));
        assert_eq!(
            c.step(shown, d, &[d], (-800, 500), false, 600),
            Some(rect(-9, 100, 260, 260))
        );
        let mut c = Controller::default();
        let shown = rect(-800, 0, 260, 260);
        c.step(shown, d, &[d], (-1500, 500), false, 0);
        assert_eq!(
            c.step(shown, d, &[d], (-1500, 500), false, 600),
            Some(rect(-800, -251, 260, 260))
        );
    }
    #[test]
    fn interaction_resets_delay_and_drag_detaches() {
        let d = display(0, 1.0);
        let shown = rect(0, 100, 260, 260);
        let mut c = Controller::default();
        c.step(shown, d, &[d], (800, 400), false, 0);
        assert_eq!(c.step(shown, d, &[d], (800, 400), true, 700), None);
        assert_eq!(c.step(shown, d, &[d], (800, 400), false, 800), None);
        assert_eq!(c.step(shown, d, &[d], (800, 400), false, 1399), None);
        let moved = rect(500, 100, 300, 260);
        assert_eq!(c.step(moved, d, &[d], (800, 400), false, 1500), None);
        assert_eq!(c.restore(moved), None);
    }
    #[test]
    fn avoids_monitor_seams_and_restores_after_monitor_removal() {
        let left = display(-1920, 1.0);
        let right = display(0, 1.0);
        let mut c = Controller::default();
        let shown = rect(0, 100, 260, 260);
        assert_eq!(
            c.step(shown, right, &[left, right], (800, 400), false, 0),
            None
        );
        assert_eq!(
            c.step(shown, right, &[left, right], (800, 400), false, 1000),
            None
        );
        let shown = rect(-1920, 100, 260, 260);
        c.step(shown, left, &[left, right], (800, 400), false, 1100);
        let hidden = c
            .step(shown, left, &[left, right], (800, 400), false, 1700)
            .unwrap();
        assert_eq!(
            c.step(hidden, right, &[right], (800, 400), false, 1800),
            Some(rect(0, 100, 260, 260))
        );
    }
    #[test]
    fn unrelated_mouse_gesture_keeps_hidden_note_and_external_move_wins() {
        let d = display(0, 1.0);
        let shown = rect(0, 100, 260, 260);
        let mut c = Controller::default();
        c.step(shown, d, &[d], (800, 400), false, 0);
        let hidden = c.step(shown, d, &[d], (800, 400), false, 600).unwrap();
        assert_eq!(c.step(hidden, d, &[d], (800, 400), true, 700), None);
        assert_eq!(c.restore(rect(700, 100, 260, 260)), None);
    }
}
