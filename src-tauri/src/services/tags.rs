// Keep these Markdown rules aligned with features/notes/tags.ts via shared fixtures.
pub fn extract_tags(content: &str) -> Vec<String> {
    let mut fence: Option<(char, usize)> = None;
    let mut text = String::new();
    for line in content.lines() {
        let trimmed = line.trim_start_matches(' ');
        let indent = line.len() - trimmed.len();
        let marker = trimmed.chars().next().unwrap_or(' ');
        let length = trimmed.chars().take_while(|&c| c == marker).count();
        let is_fence = indent <= 3 && matches!(marker, '`' | '~') && length >= 3;
        if let Some((open_marker, open_length)) = fence {
            if is_fence
                && marker == open_marker
                && length >= open_length
                && trimmed[length..].trim().is_empty()
            {
                fence = None;
            }
        } else if is_fence {
            fence = Some((marker, length));
        } else if !line.starts_with("    ") && !line.starts_with('\t') {
            text.push_str(line);
        }
        text.push('\n');
    }
    let chars: Vec<char> = text.chars().collect();
    let mut tags = Vec::new();
    let mut index = 0;
    while index < chars.len() {
        let ch = chars[index];
        if ch == '\\' {
            index += 2;
            continue;
        }
        if ch == '`' {
            let mut end = index + 1;
            while chars.get(end) == Some(&'`') {
                end += 1;
            }
            let length = end - index;
            let mut closing = end;
            let mut found = false;
            while closing < chars.len() {
                if chars[closing] != '`' {
                    closing += 1;
                    continue;
                }
                let mut after = closing + 1;
                while chars.get(after) == Some(&'`') {
                    after += 1;
                }
                if after - closing == length {
                    index = after;
                    found = true;
                    break;
                }
                closing = after;
            }
            if !found {
                index = end;
            }
            continue;
        }
        if ch == '[' {
            let mut close = index + 1;
            let mut brackets = 1;
            while close < chars.len() {
                if chars[close] == '\\' {
                    close += 2;
                    continue;
                }
                if chars[close] == '[' {
                    brackets += 1;
                }
                if chars[close] == ']' {
                    brackets -= 1;
                    if brackets == 0 {
                        break;
                    }
                }
                close += 1;
            }
            if chars.get(close + 1) == Some(&':') {
                while index < chars.len() && chars[index] != '\n' {
                    index += 1;
                }
                continue;
            }
            if close < chars.len() {
                if let Some(&opening @ ('(' | '[')) = chars.get(close + 1) {
                    let closing = if opening == '(' { ')' } else { ']' };
                    let mut depth = 1;
                    let mut end = close + 2;
                    while end < chars.len() && depth > 0 {
                        if chars[end] == '\\' {
                            end += 2;
                            continue;
                        }
                        if chars[end] == opening {
                            depth += 1;
                        }
                        if chars[end] == closing {
                            depth -= 1;
                        }
                        end += 1;
                    }
                    if depth == 0 {
                        index = end;
                        continue;
                    }
                }
            }
        }
        if ["http://", "https://", "www."].iter().any(|prefix| {
            chars[index..]
                .iter()
                .take(prefix.len())
                .collect::<String>()
                .eq_ignore_ascii_case(prefix)
        }) {
            while index < chars.len() && !chars[index].is_whitespace() {
                index += 1;
            }
            continue;
        }
        let boundary = index == 0
            || chars[index - 1].is_whitespace()
            || "([{（【「『，。！？、；：,:;!?".contains(chars[index - 1]);
        if ch == '#' && boundary {
            let mut end = index + 1;
            while end < chars.len()
                && (chars[end].is_alphanumeric() || matches!(chars[end], '_' | '-'))
            {
                end += 1;
            }
            if end > index + 1 {
                let tag: String = chars[index + 1..end].iter().collect();
                if !tags.contains(&tag) {
                    tags.push(tag);
                }
            }
            index = end;
        } else {
            index += 1;
        }
    }
    tags
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_markdown_tag_fixtures() {
        let fixtures: serde_json::Value =
            serde_json::from_str(include_str!("../../../src/features/notes/tagFixtures.json"))
                .unwrap();
        for fixture in fixtures.as_array().unwrap() {
            let content = fixture["content"].as_str().unwrap();
            let expected: Vec<String> = serde_json::from_value(fixture["tags"].clone()).unwrap();
            assert_eq!(extract_tags(content), expected, "{content}");
        }
    }
}
