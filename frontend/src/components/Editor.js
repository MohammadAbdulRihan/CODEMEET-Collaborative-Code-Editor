

import React, { useEffect, useRef } from "react";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../Actions";

//codemirror
// This component initializes a CodeMirror editor and handles real-time code changes
// It listens for changes in the editor and emits them to other clients in the room
// It also listens for code changes from other clients and updates the editor accordingly
// The editor is configured for JavaScript with a Dracula theme and supports auto-closing tags and

const Editor = ({ socketRef, roomId, onCodeChange, externalCode = "" }) => {
  const editorRef = useRef(null);
  const onCodeChangeRef = useRef(onCodeChange);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
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

    editorRef.current.on("change", (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      onCodeChangeRef.current(code);
      if (origin !== "setValue") {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
        });
      }
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
      }
    };
  }, [roomId, socketRef]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const currentCode = editorRef.current.getValue();
    if (externalCode !== currentCode) {
      editorRef.current.setValue(externalCode || "");
    }
  }, [externalCode]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const syncIncomingCode = ({ code }) => {
      if (code != null && editorRef.current && editorRef.current.getValue() !== code) {
        editorRef.current.setValue(code);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, syncIncomingCode);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, syncIncomingCode);
    };
  }, [socketRef]);

  return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
