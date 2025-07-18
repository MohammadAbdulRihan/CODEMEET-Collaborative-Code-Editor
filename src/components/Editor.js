
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../Actions";

const Editor = forwardRef(({ socketRef, roomId, onCodeChange }, ref) => {
  const editorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearCode: () => {
      if (editorRef.current) {
        editorRef.current.setValue("");
      }
    },
  }));

  useEffect(() => {
    async function init() {
      editorRef.current = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );

      // Load saved code from localStorage
      const savedCode = localStorage.getItem("savedCode");
      if (savedCode) {
        editorRef.current.setValue(savedCode);
      }

      editorRef.current.on("change", (instance, changes) => {
        
        const { origin } = changes;
        const code = instance.getValue();

        // Save code to localStorage
        localStorage.setItem("savedCode", code);


        // Emit code change to server
        
        onCodeChange(code);
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    }

    init();
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code != null && code !== editorRef.current.getValue()) {
          editorRef.current.setValue(code);
        }
      });
    }

    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
    };
  }, [socketRef]);

  return <textarea id="realtimeEditor"></textarea>;
});
export default Editor;
