#!/usr/bin/env python3
"""
Synchronizes theme files with
renderer/themes.js, css/themes/index.css, css/styles.css, src/preferences.html
"""

import os
import re
import tempfile
from pathlib import Path
import glob

def find_theme_files():
    theme_dir = Path("css/themes")
    theme_files = []
    
    for css_file in theme_dir.glob("*.css"):
        filename = css_file.stem
        if filename != "index" and not filename.endswith(".template"):
            theme_files.append(filename)
    
    return sorted(theme_files)

def update_themes_js(themes):
    themes_js_path = Path("renderer/themes.js")
    
    if not themes_js_path.exists():
        print(f"Warning: {themes_js_path} not found, skipping...")
        return
    
    js_themes = "['system-default'"
    for theme in themes:
        js_themes += f", '{theme}'"
    js_themes += "]"
    
    content = themes_js_path.read_text(encoding='utf-8')
    
    pattern = r'const themeOptions = \[.*?\];'
    replacement = f'const themeOptions = {js_themes};'
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    themes_js_path.write_text(new_content, encoding='utf-8')

def update_themes_index_css(themes):
    index_css_path = Path("css/themes/index.css")
    
    content = "/* Theme imports - AUTO-GENERATED FILE */\n"
    for theme in themes:
        content += f"@import '{theme}.css';\n"
    
    index_css_path.write_text(content, encoding='utf-8')

def update_styles_css_imports(themes):
    styles_css_path = Path("css/styles.css")
    lines = styles_css_path.read_text(encoding='utf-8').split('\n')
    
    new_lines = []
    in_imports = False
    imports_replaced = False
    
    for line in lines:
        if "/* Import themes */" in line:
  
            new_lines.append("/* Import themes */")
            for theme in themes:
                new_lines.append(f"@import url('themes/{theme}.css');")
            in_imports = True
            imports_replaced = True
        elif in_imports and re.match(r"^@import url\(.*themes\/.*\.css.*\);", line):
            continue
        elif in_imports and not re.match(r"^@import url\(.*themes\/.*\.css.*\);", line):
            in_imports = False
            new_lines.append(line)
        else:
            new_lines.append(line)
    
    styles_css_path.write_text('\n'.join(new_lines), encoding='utf-8')

def camel_case(text):
    """Convert kebab-case to camelCase."""
    components = text.split('-')
    return components[0] + ''.join(word.capitalize() for word in components[1:])

def title_case(text):
    """Convert kebab-case to Title Case."""
    return ' '.join(word.capitalize() for word in text.split('-'))

def update_preferences_html(themes):
    preferences_path = Path("src/preferences.html")
    content = preferences_path.read_text(encoding='utf-8')
    
    new_options = []
    new_options.append('                    <option value="system-default" data-i18n="$Preferences.systemDefault" selected>System Default</option>')
    
    for theme in themes:
        display_name = title_case(theme)
        i18n_key = camel_case(theme)
        new_options.append(f'                    <option value="{theme}" data-i18n="$Preferences.{i18n_key}">{display_name}</option>')
    
    # Use regex to replace the theme select options
    pattern = r'(<select[^>]*id="theme"[^>]*>)\s*(<option value="system-default"[^>]*>.*?</option>)(.*?)(\s*</select>)'
    
    def replace_options(match):
        select_open = match.group(1)
        closing_select = match.group(4)
        return select_open + '\n' + '\n'.join(new_options) + closing_select
    
    new_content = re.sub(pattern, replace_options, content, flags=re.DOTALL)
    
    # If that didn't work, try this
    if new_content == content:
        lines = content.split('\n')
        new_lines = []
        in_theme_select = False
        replaced = False
        
        for line in lines:
            if '<select' in line and 'id="theme"' in line:
                new_lines.append(line)
                in_theme_select = True
            elif in_theme_select and '<option value="system-default"' in line and not replaced:
                new_lines.extend(new_options)
                replaced = True
                while True:
                    try:
                        next_line = next(iter([lines.pop(lines.index(line)+1) for _ in range(1)]))
                        if '</select>' in next_line:
                            new_lines.append(next_line)
                            break
                    except:
                        break
                in_theme_select = False
            elif not in_theme_select or replaced:
                new_lines.append(line)
        
        new_content = '\n'.join(new_lines)
    preferences_path.write_text(new_content, encoding='utf-8')

def main():
    """Main function to refresh all theme-related files."""
    script_dir = Path(__file__).parent
    os.chdir(script_dir.parent)
    
    print("Refreshing themes...")
    
    themes = find_theme_files()
    
    if not themes:
        print("No theme files found!")
        return
    
    update_themes_js(themes)
    update_themes_index_css(themes)
    update_styles_css_imports(themes)
    update_preferences_html(themes)
    
    print(f"Found themes: {', '.join(themes)}")
    print()

if __name__ == "__main__":
    main()