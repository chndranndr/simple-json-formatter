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

// Function to format YAML
function formatYAML(yamlString) {
    // Load the YAML string, jsyaml.load will throw an error if it's invalid
    const parsedYaml = jsyaml.load(yamlString);
    // Dump the JavaScript object back to a YAML string with indentation
    return jsyaml.dump(parsedYaml, { indent: 2 });
}

// Function to validate Java syntax (basic checks)
function validateJava(javaCode) {
    const errors = [];
    const lines = javaCode.split('\\n');

    // 1. Balanced brackets
    const stack = [];
    const bracketPairs = { '(': ')', '[': ']', '{': '}' };
    for (let i = 0; i < javaCode.length; i++) {
        const char = javaCode[i];
        if (bracketPairs[char]) {
            stack.push(char);
        } else if (Object.values(bracketPairs).includes(char)) {
            if (stack.length === 0 || bracketPairs[stack.pop()] !== char) {
                errors.push(`Mismatched or unexpected closing bracket: ${char}`);
                // No need to continue checking brackets if an error is found here,
                // as it can lead to many follow-up errors.
                break;
            }
        }
    }
    if (stack.length > 0) {
        errors.push(`Unclosed opening brackets: ${stack.join(', ')}`);
    }

    // 2. Semicolon checks (heuristic)
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        // Skip empty lines, comments, package/import, class/interface/enum declarations, method signatures, and lines ending with { or } or ;
        if (trimmedLine === '' ||
            trimmedLine.startsWith('//') ||
            trimmedLine.startsWith('/*') ||
            trimmedLine.endsWith('*/') ||
            trimmedLine.startsWith('package ') ||
            trimmedLine.startsWith('import ') ||
            trimmedLine.match(/^(public|private|protected)?\s*(static\s+|final\s+|abstract\s+)*\s*(class|interface|enum)\s+\w+/i) || // basic class/interface/enum
            trimmedLine.match(/\w+\s+\w+\(.*\)\s*(\{?|throws)?$/) || // basic method signature
            trimmedLine.match(/^(if|for|while|switch)\s*\(.*\)\s*\{?$/) || // control structures
            trimmedLine.endsWith('{') ||
            trimmedLine.endsWith('}') ||
            trimmedLine.endsWith(';') ||
            trimmedLine.endsWith(',')) { // Allow lines ending with comma (e.g. enum values, array initializers)
            return;
        }
        // If it's a non-empty line that doesn't fall into skips and doesn't end with ;, it might need one.
        // This is a very rough heuristic.
        if (trimmedLine.length > 0 && !trimmedLine.endsWith(';')) {
            // Further refine: check if it's part of a multi-line statement
            // For simplicity, we'll flag it if it's not obviously a block opener or comment
            if (!trimmedLine.endsWith('{') && !trimmedLine.match(/\/\*|\*\//)) {
                 // Check if the next non-empty line starts with typical statement continuation characters like '.', '[', or is a lambda '->'
                let nextLineIndex = index + 1;
                let nextNonEmptyLine = '';
                while(nextLineIndex < lines.length) {
                    nextNonEmptyLine = lines[nextLineIndex].trim();
                    if (nextNonEmptyLine !== '' && !nextNonEmptyLine.startsWith('//') && !nextNonEmptyLine.startsWith('/*')) break;
                    nextLineIndex++;
                }
                if (nextNonEmptyLine && (nextNonEmptyLine.startsWith('.') || nextNonEmptyLine.startsWith('[') || nextNonEmptyLine.includes('->'))) {
                    // Likely a multi-line statement, so don't flag current line for missing semicolon
                } else {
                    errors.push(`Line ${index + 1} might be missing a semicolon: "...${trimmedLine.slice(-30)}"`);
                }
            }
        }
    });

    // 3. Basic comma misuse
    if (javaCode.match(/,,/)) {
        errors.push("Found consecutive commas ',,'");
    }
    const linesWithTrailingCommas = [];
    javaCode.split('\\n').forEach((line, index) => {
        // Avoid flagging comments or lines that are part of annotations correctly using trailing commas
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('@')) return;

        if (trimmedLine.match(/,\s*(\)|}|])/)) {
             errors.push(`Line ${index + 1}: Found comma before a closing bracket/brace: ${trimmedLine.match(/,\s*(\)|}|])/)[0]}`);
        }
        // A simple check for trailing comma, might be too broad for Java as some contexts allow it (e.g. array initializers last element)
        // For now, let's be conservative and not add a general trailing comma check to avoid false positives.
        // A more specific check could be for things like `method(arg1,);`
        if (trimmedLine.match(/,\s*;/)) {
            errors.push(`Line ${index + 1}: Found comma directly before a semicolon: ",;"`);
        }
    });


    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Function to validate FreeMarker syntax (basic checks)
function validateFreeMarker(ftlCode) {
    const errors = [];
    const tagStack = [];
    // Simplified list of block tags that require a closing tag. Add more as needed.
    const blockTags = ['if', 'list', 'items', 'sep', 'macro', 'function', 'attempt', 'compress', 'transform', 'escape', 'noescape', 'autoesc', 'noautoesc', 'switch', 'case', 'default'];
    // Simplified list of self-closing tags or tags that don't need explicit stack management here
    const selfClosingOrSpecialTags = ['assign', 'global', 'local', 'include', 'import', 'lt', 'rt', 't', 'nt', 'break', 'continue', 'stop', 'return', 'setting', 'ftl', 'else', 'elseif', 'recover', 'fallback'];

    // Regex to find FTL tags/comments/interpolations
    // This regex is complex and aims to capture various FTL constructs.
    // 1. Comments: <#-- ... -->
    // 2. Closing tags: </#tagName> or </@tagName>
    // 3. Self-closing or opening tags: <#tagName ...> or <@tagName ...>
    // 4. Interpolations: ${...} or #{...}
    const ftlRegex = /(<#--[\s\S]*?-->)|(<\/\s*(?:#|@)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*>)|(<(#|@)\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*([^>]*?))?\s*(\/)?>)|(\$\{[\s\S]*?\}|\#\{[\s\S]*?\})/g;

    let match;
    let lastIndex = 0;

    while ((match = ftlRegex.exec(ftlCode)) !== null) {
        const fullMatch = match[0];
        const comment = match[1];
        const closingTag = match[2];
        const closingTagName = match[3];
        const openingTag = match[4];
        const directiveType = match[5]; // # or @
        const openingTagName = match[6];
        const tagAttributes = match[7] || ''; // Attributes/parameters
        const selfClosedMarker = match[8]; // '/' for self-closing like <#tag />
        const interpolation = match[9];

        lastIndex = ftlRegex.lastIndex;

        if (comment) continue; // Skip comments

        if (interpolation) {
            // Validate brackets inside interpolations: ${...} or #{...}
            const expression = interpolation.substring(2, interpolation.length - 1);
            const exprErrors = validateExpressionBrackets(expression, `Interpolation ${interpolation.substring(0,15)}...`);
            errors.push(...exprErrors);
            continue;
        }

        if (openingTag) {
            // Validate brackets in attributes if any
            if (tagAttributes) {
                const attrErrors = validateExpressionBrackets(tagAttributes, `Tag <${directiveType}${openingTagName} ...> attributes`);
                errors.push(...attrErrors);
            }

            if (selfClosedMarker || openingTagName === 'else' || openingTagName === 'elseif' || openingTagName === 'recover' || openingTagName === 'fallback' || selfClosingOrSpecialTags.includes(openingTagName)) {
                if (openingTagName === 'elseif' || openingTagName === 'else' || openingTagName === 'recover' || openingTagName === 'fallback') {
                    if (tagStack.length === 0) {
                        errors.push(`Unexpected <#${openingTagName}> without a preceding opening tag.`);
                    } else {
                        const lastTag = tagStack[tagStack.length -1];
                        // <#else> and <#elseif> should be within an <#if> or <#switch> (more complex for switch)
                        // <#recover> within <#attempt>
                        // <#fallback> within <#switch> (as a special case)
                        if ( (openingTagName === 'else' || openingTagName === 'elseif') && !(lastTag === 'if' || lastTag === 'switch') ) {
                             // errors.push(`Debug: <#${openingTagName}> found. Stack top: ${lastTag}`);
                        } else if (openingTagName === 'recover' && lastTag !== 'attempt') {
                            errors.push(`<#recover> must be inside an <#attempt> block. Found inside <#${lastTag}>.`);
                        }
                    }
                }
                // It's a self-closing tag or special handling, don't push to stack unless it's a block opener that was self-closed (which is an error)
                if (selfClosedMarker && blockTags.includes(openingTagName)){
                    errors.push(`Block directive <#${openingTagName}> cannot be self-closing.`);
                }

            } else if (blockTags.includes(openingTagName)) {
                tagStack.push(openingTagName);
            } else if (directiveType === '@') { // Custom directives might be paired or self-closing
                 // Heuristic: if it's not known block tag and has no self-closed marker, assume it's an opening of a pair.
                 // More robust solution would require knowing custom directive types.
                if (!selfClosedMarker) {
                    tagStack.push(`@${openingTagName}`);
                }
            }
        } else if (closingTag) {
            let expectedTagName = closingTagName;
            if (directiveType === '@' && !expectedTagName.startsWith('@')) { // Ensure custom directive closing tags are checked correctly
                expectedTagName = `@${closingTagName}`;
            }


            if (tagStack.length === 0) {
                errors.push(`Unexpected closing tag: ${fullMatch}`);
            } else {
                const lastOpenedTag = tagStack.pop();
                let expectedClose = lastOpenedTag;
                if (lastOpenedTag.startsWith('@') && !closingTagName.startsWith('@')){
                    // no-op, closing tag for custom directive does not need @
                } else if (!lastOpenedTag.startsWith('@') && closingTagName.startsWith('@')) {
                     errors.push(`Mismatched closing tag: Expected </#${lastOpenedTag}> but found </@${closingTagName}>`);
                     continue;
                }


                if (lastOpenedTag.startsWith('@') ? `@${closingTagName}` !== lastOpenedTag : closingTagName !== lastOpenedTag) {
                     errors.push(`Mismatched closing tag: Expected </#${lastOpenedTag.replace('@','')}> but found ${fullMatch}`);
                }
            }
        }
    }

    if (tagStack.length > 0) {
        errors.push(`Unclosed FTL tags: ${tagStack.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Helper function to validate brackets within expressions (e.g., inside ${...} or tag attributes)
function validateExpressionBrackets(expression, context) {
    const errors = [];
    const stack = [];
    const bracketPairs = { '(': ')', '[': ']', '{': '}' }; // Allow {} for inline maps/hashes
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];

        if (inString) {
            if (char === stringChar) {
                if (i > 0 && expression[i-1] === '\\') { // Handle escaped quotes
                    // still in string
                } else {
                    inString = false;
                }
            }
            continue; // Ignore brackets inside strings
        }

        if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            continue;
        }

        if (bracketPairs[char]) {
            stack.push(char);
        } else if (Object.values(bracketPairs).includes(char)) {
            if (stack.length === 0 || bracketPairs[stack.pop()] !== char) {
                errors.push(`Mismatched or unexpected closing bracket '${char}' in ${context}`);
                break; // Stop on first error to avoid cascading issues
            }
        }
    }
    // Unclosed brackets in expressions are not checked here to avoid conflict with FTL's own error reporting for incomplete expressions
    // For example `${user.name(` will be an FTL error anyway. This focuses on mismatches.
    return errors;
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
        } else if (currentFormat === 'yaml') {
            // Beautify YAML
            const beautified = formatYAML(input); // We'll define this function
            output.textContent = beautified; // YAML output as plain text
            validationIndicator.style.display = 'block';
            validationIndicator.textContent = 'YAML is valid & formatted!';
        } else if (currentFormat === 'java') {
            const validationResult = validateJava(input); // We'll define this function
            if (validationResult.isValid) {
                output.textContent = input; // Show original code
                validationIndicator.style.display = 'block';
                validationIndicator.textContent = 'Java syntax appears valid (basic checks).';
            } else {
                output.textContent = 'Java Syntax Errors Found:\n\n' + validationResult.errors.join('\n');
                validationIndicator.style.display = 'block';
                validationIndicator.textContent = 'Java syntax errors found!';
                validationIndicator.style.color = 'red'; // Optional: make error more prominent
            }
        } else if (currentFormat === 'freemarker') {
            const validationResult = validateFreeMarker(input); // We'll define this function
            if (validationResult.isValid) {
                output.textContent = input; // Show original code
                validationIndicator.style.display = 'block';
                validationIndicator.textContent = 'FreeMarker syntax appears valid (basic checks).';
            } else {
                output.textContent = 'FreeMarker Syntax Errors Found:\n\n' + validationResult.errors.join('\n');
                validationIndicator.style.display = 'block';
                validationIndicator.textContent = 'FreeMarker syntax errors found!';
                validationIndicator.style.color = 'red';
            }
        }
    } catch (e) {
        // Reset validation indicator color if it was changed
        validationIndicator.style.color = ''; // Or your default color
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