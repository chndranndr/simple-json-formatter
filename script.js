// Hide validation indicator by default
document.querySelector('.validation-indicator').style.display = 'none';

// Track current format mode
let currentFormat = 'json';

// Add format toggle functionality
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFormat = this.dataset.format;
        document.getElementById('input').placeholder = `Paste your ${currentFormat.toUpperCase()} here...`;
        document.querySelector('.validation-indicator').style.display = 'none';
        document.getElementById('output').innerHTML = '';
    });
});

// Function to beautify HTML with syntax highlighting
function beautifyHTML(html) {
    let formatted = '';
    let indent = 0;
    const tab = '    ';
    
    // Remove existing whitespace between tags and normalize self-closing tags
    html = html.replace(/>\s*[\r\n]+\s*</g, '><')
             .replace(/<([^>]+?)\s*\/>/g, '<$1></>');
    
    // Split by tags while preserving them
    html.split(/(<\/?[^>]+>)/).forEach(token => {
        if (!token) return;
        
        if (token.startsWith('</')) {
            // Closing tag - decrease indent before adding
            indent = Math.max(0, indent - 1);
            const coloredToken = token.replace(/^<\/([^\s>]+)>/,
                '<span style="color: #FF69B4">&lt;/</span>' +
                '<span style="color: #00FF00">$1</span>' +
                '<span style="color: #FF69B4">&gt;</span>');
            formatted += tab.repeat(indent) + coloredToken + '\n';
        } else if (token.startsWith('<')) {
            // Opening tag - add at current indent and increase after
            const coloredToken = token.replace(/^<([^\s>]+)(\s+[^>]*)?>/,
                (match, tag, attrs) => {
                    let result = '<span style="color: #FF69B4">&lt;</span>' +
                                '<span style="color: #00FF00">' + tag + '</span>';
                    if (attrs) {
                        // Color attributes and their values
                        result += attrs.replace(/([^\s=]+)(?:=(["'])(.*?)\2)?/g,
                            (match, attr, quote, value) => {
                                if (value !== undefined) {
                                    return ' <span style="color: #00FFFF">' + attr + '</span>' +
                                           '=' +
                                           quote +
                                           '<span style="color: #FFA500">' + value + '</span>' +
                                           quote;
                                }
                                return ' <span style="color: #00FFFF">' + attr + '</span>';
                            });
                    }
                    return result + '<span style="color: #FF69B4">&gt;</span>';
                });
            formatted += tab.repeat(indent) + coloredToken + '\n';
            // Don't increase indent for self-closing, DOCTYPE, comments, or processing instructions
            if (!token.match(/<(!--|!DOCTYPE|\?|\/?(link|meta|img|br|hr|input)\b)/i)) {
                indent++;
            }
        } else if (token.trim()) {
            // Content between tags
            formatted += tab.repeat(indent) + '<span style="color: #FFFFFF">' + token.trim() + '</span>\n';
        }
    });
    
    return formatted;
}

// Function to add rainbow colors to brackets
function addRainbowColors(json) {
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];
    let depth = 0;
    let result = '';
    
    for (let i = 0; i < json.length; i++) {
        const char = json[i];
        if (char === '{' || char === '[') {
            result += `<span style="color: ${colors[depth % colors.length]}">${char}</span>`;
            depth++;
        } else if (char === '}' || char === ']') {
            depth--;
            result += `<span style="color: ${colors[depth % colors.length]}">${char}</span>`;
        } else {
            result += char;
        }
    }
    
    return result;
}


document.getElementById('beautify').addEventListener('click', function() {
    const input = document.getElementById('input').value;
    const output = document.getElementById('output');
    const validationIndicator = document.querySelector('.validation-indicator');

    // Hide validation indicator if input is empty
    if (!input.trim()) {
        output.innerHTML = '';
        validationIndicator.style.display = 'none';
        return;
    }

    try {
        if (currentFormat === 'json') {
            // Parse the input JSON to validate it
            const parsedJson = JSON.parse(input);
            // Convert it back to a string with proper formatting
            const beautified = JSON.stringify(parsedJson, null, 4);
            // Add rainbow colors to brackets
            output.innerHTML = addRainbowColors(beautified);
            validationIndicator.style.display = 'block';
            validationIndicator.textContent = 'JSON is valid!';
        } else if (currentFormat === 'html') {
            // Beautify HTML
            const beautified = beautifyHTML(input);
            output.innerHTML = beautified;
            validationIndicator.style.display = 'block';
            validationIndicator.textContent = 'HTML is formatted!';
        }
    } catch (e) {
        output.textContent = `Error: ${e.message}`;
        validationIndicator.style.display = 'none';
    }
});

// Add copy button functionality
document.getElementById('copy').addEventListener('click', function() {
    const output = document.getElementById('output');
    const text = output.textContent;
    
    if (!text) return;
    
    // Create a temporary textarea element to copy from
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Visual feedback for copy action
    const originalText = this.textContent;
    this.textContent = 'Copied!';
    setTimeout(() => {
        this.textContent = originalText;
    }, 2000);
});