import React, { useState, useRef, useEffect, useCallback } from "react";
import htmlDocx from "html-docx-js/dist/html-docx";

const TextEditor = () => {
  const [editorState, setEditorState] = useState({
    fontFamily: "Arial",
    fontSize: "16px",
    textColor: "#000000",
    backgroundColor: "#fff",
    alignment: "left"
  });
  
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const editorRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const showStatus = useCallback((message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 1000);
  }, []);

  const saveToHistory = useCallback(() => {
    if (!editorRef.current) return;
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(editorRef.current.innerHTML);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleEditorInput = useCallback(() => {
    if (isInitialized) {
      saveToHistory();
    }
  }, [isInitialized, saveToHistory]);

  const mapPropertyToCss = useCallback((property) => {
    const map = {
      fontFamily: "fontFamily",
      fontSize: "fontSize",
      textColor: "color",
      backgroundColor: "backgroundColor",
      alignment: "textAlign"
    };
    return map[property] || property;
  }, []);

  const applyStyleToSelection = useCallback((property, value) => {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
  
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
  
    const cssProperty = mapPropertyToCss(property);
    span.style[cssProperty] = value;
  
    try {
      range.surroundContents(span);
      selection.removeAllRanges();
      saveToHistory();
    } catch (e) {
      console.error("Cannot apply style to selection:", e);
      showStatus("Cannot apply style to this selection");
    }
  }, [mapPropertyToCss, saveToHistory, showStatus]);

  const applyStyleToEditor = useCallback((property, value) => {
    if (!editorRef.current) return;
    const cssProperty = mapPropertyToCss(property);
    editorRef.current.style[cssProperty] = value;
  }, [mapPropertyToCss]);

  const handleStyleChange = useCallback((property, value) => {
    setEditorState(prevState => ({
      ...prevState,
      [property]: value
    }));
  
    if (window.getSelection().toString().length > 0) {
      applyStyleToSelection(property, value);
    } else {
      applyStyleToEditor(property, value);
    }
  
    saveToHistory();
  }, [applyStyleToEditor, applyStyleToSelection, saveToHistory]);

  const applyFormatting = useCallback((format) => {
    try {
      document.execCommand(format, false, null);
      saveToHistory();
      showStatus(`Applied ${format}`);
    } catch (e) {
      console.error(`Error applying ${format}:`, e);
      showStatus(`Could not apply ${format}`);
    }
  }, [saveToHistory, showStatus]);

  const applyAlignment = useCallback((alignment) => {
    try {
      document.execCommand(`justify${alignment}`, false, null);
      setEditorState(prevState => ({
        ...prevState,
        alignment
      }));
      saveToHistory();
      showStatus(`Aligned ${alignment}`);
    } catch (e) {
      console.error(`Error applying alignment:`, e);
      showStatus(`Could not align text`);
    }
  }, [saveToHistory, showStatus]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      editorRef.current.innerHTML = history[historyIndex - 1];
      showStatus("Undo");
    }
  }, [history, historyIndex, showStatus]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      editorRef.current.innerHTML = history[historyIndex + 1];
      showStatus("Redo");
    }
  }, [history, historyIndex, showStatus]);

  const handleSave = useCallback(() => {
    try {
      if (!editorRef.current || !editorRef.current.innerHTML.trim()) {
        showStatus("Nothing to save");
        return;
      }
      
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: ${editorState.fontFamily}; font-size: ${editorState.fontSize}; }
          </style>
        </head>
        <body>
          ${editorRef.current.innerHTML}
        </body>
        </html>
      `;
      
      const docx = htmlDocx.asBlob(content);
      const url = URL.createObjectURL(docx);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.docx";
      a.click();
      URL.revokeObjectURL(url);
      
      showStatus("Document saved");
    } catch (error) {
      console.error("Error saving document:", error);
      showStatus("Error saving document");
    }
  }, [editorState.fontFamily, editorState.fontSize, showStatus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && 
          ['b', 'i', 'u', 'z', 'y'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        
        switch(e.key.toLowerCase()) {
          case 'b':
            applyFormatting('bold');
            break;
          case 'i':
            applyFormatting('italic');
            break;
          case 'u':
            applyFormatting('underline');
            break;
          case 'z':
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            handleRedo();
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [applyFormatting, handleRedo, handleUndo]);

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = "";
      saveToHistory();
      setIsInitialized(true);
    }
  }, [isInitialized, saveToHistory]);

  return (
    <div className="editor-container">
      <h1 className="editor-title">Text Editor</h1>
      <div className="toolbar">
        <select 
          value={editorState.fontFamily} 
          onChange={(e) => handleStyleChange("fontFamily", e.target.value)}
        >
            <option value="Arial">Arial</option>
            <option value="Roboto">Roboto</option>
            <option value="Merriweather">Merriweather</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Poppins">Poppins</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Raleway">Raleway</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Inter">Inter</option>
            <option value="Work Sans">Work Sans</option>
            <option value="Fira Sans">Fira Sans</option>
            <option value="Karla">Karla</option>
            <option value="Quicksand">Quicksand</option>
            <option value="IBM Plex Sans">IBM Plex Sans</option>
            <option value="Raleway">Raleway</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="Titillium Web">Titillium Web</option>
            <option value="PT Sans">PT Sans</option>
            <option value="Cabin">Cabin</option>
            <option value="Oswald">Oswald</option>
            <option value="Barlow">Barlow</option>
            <option value="Lexend">Lexend</option>
            <option value="Hind">Hind</option>
            <option value="Nunito">Nunito</option>
            <option value="Mulish">Mulish</option>
            <option value="Exo 2">Exo 2</option>
            <option value="Asap">Asap</option>
            <option value="Varela Round">Varela Round</option>
            <option value="Josefin Sans">Josefin Sans</option>
        </select>
        
        <select 
          value={editorState.fontSize} 
          onChange={(e) => handleStyleChange("fontSize", e.target.value)}
        >
          <option value="4px">4</option>
          <option value="8px">8</option>
          <option value="10px">10</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
          <option value="36px">36</option>
          <option value="42px">42</option>
          <option value="48px">48</option>
          <option value="56px">56</option>
          <option value="60px">60</option>
        </select>
        
        <button onClick={() => applyFormatting("bold")} title="Bold (Ctrl+B)">B</button>
        <button onClick={() => applyFormatting("italic")} title="Italic (Ctrl+I)">I</button>
        <button onClick={() => applyFormatting("underline")} title="Underline (Ctrl+U)">U</button>
        
        <div className="color-picker">
          <label>Text: </label>
          <input 
            type="color" 
            value={editorState.textColor} 
            onChange={(e) => handleStyleChange("textColor", e.target.value)}
            title="Text Color"
          />
        </div>
        
        <div className="color-picker">
          <label>Highlight: </label>
          <input 
            type="color" 
            value={editorState.backgroundColor} 
            onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
            title="Background Color"
          />
        </div>
        
        <div className="alignment-buttons">
          <button onClick={() => applyAlignment("Left")} title="Align Left">L</button>
          <button onClick={() => applyAlignment("Center")} title="Align Center">C</button>
          <button onClick={() => applyAlignment("Right")} title="Align Right">R</button>
          <button onClick={() => applyAlignment("Full")} title="Justify">J</button>
        </div>
        
        <div className="history-buttons">
          <button 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          >
            Redo
          </button>
        </div>
        
        <button 
          onClick={handleSave}
          className="save-button"
          title="Save as Word document"
        >
          Save as Word
        </button>
      </div>
      
      {statusMessage && (
        <div className="status-bar">
          {statusMessage}
        </div>
      )}
      
      <div
        ref={editorRef}
        className="editor"
        contentEditable="true"
        suppressContentEditableWarning={true}
        onInput={handleEditorInput}
        style={{
          fontFamily: editorState.fontFamily,
          fontSize: editorState.fontSize,
          textAlign: editorState.alignment,
          color: editorState.textColor,
          backgroundColor: editorState.backgroundColor !== 'transparent' ? editorState.backgroundColor : 'white'
        }}
      ></div>
    </div>
  );
};

export default TextEditor;