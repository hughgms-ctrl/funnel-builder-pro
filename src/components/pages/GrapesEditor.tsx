import { useEffect, useRef, useState } from "react";
import { usePageStore } from "@/lib/page-store";
import "./grapes-dark.css";

interface Props {
  pageId: string;
  onEditorInit?: (editor: any) => void;
}

export function GrapesEditor({ pageId, onEditorInit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const page = usePageStore((s) => s.pages.find((p) => p.id === pageId));
  const updatePage = usePageStore((s) => s.updatePage);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    let destroyed = false;

    (async () => {
      try {
        // Dynamic imports — prevents SSR "window is not defined" crash
        const [gjs] = await Promise.all([
          import("grapesjs"),
          // @ts-ignore — CSS module
          import("grapesjs/dist/css/grapes.min.css"),
        ]);

        if (destroyed || !containerRef.current) return;

        const grapesjs = (gjs as any).default ?? gjs;

        // Plugins loaded dynamically
        const [{ default: blocksBasic }, { default: pluginForms }] = await Promise.all([
          import("grapesjs-blocks-basic"),
          import("grapesjs-plugin-forms"),
        ]);

        if (destroyed || !containerRef.current) return;

        const editor = grapesjs.init({
          container: containerRef.current,
          height: "100%",
          width: "auto",
          fromElement: false,
          storageManager: false,
          undoManager: true,
          noticeOnUnload: false,

          // Load existing content
          components: page?.html || "",
          style: page?.css || "",

          plugins: [blocksBasic, pluginForms],
          pluginsOpts: {
            [blocksBasic as any]: {
              flexGrid: true,
            },
            [pluginForms as any]: {},
          },

          // Local image uploads (converts to base64 automatically without needing a backend endpoint)
          assetManager: {
            embedAsBase64: true,
          },

          // Extra blocks — GrapesJS will auto-append panels to the container
          blockManager: {},

          layerManager: {},

          styleManager: {
            sectors: [
              { name: "Layout", open: true, buildProps: ["display", "flex-direction", "justify-content", "align-items", "width", "height", "max-width", "margin", "padding"] },
              { name: "Tipografia", open: false, buildProps: ["font-family", "font-size", "font-weight", "color", "line-height", "text-align", "text-shadow"] },
              { name: "Fundo", open: false, buildProps: ["background-color", "background", "box-shadow"] },
              { name: "Borda (Botões Vazados)", open: false, buildProps: ["border", "border-width", "border-style", "border-color", "border-radius"] },
              { name: "Extra", open: false, buildProps: ["opacity", "transition", "transform", "overflow", "cursor", "z-index"] },
            ],
          },

          traitManager: {},

          deviceManager: {
            devices: [
              { id: "desktop", name: "Desktop", width: "" },
              { id: "tablet", name: "Tablet", width: "768px", widthMedia: "1024px" },
              { id: "mobile", name: "Mobile", width: "375px", widthMedia: "480px" },
            ],
          },

          canvas: {
            styles: [
              "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap",
            ],
            scripts: [],
          },
        });

        editorRef.current = editor;
        setLoading(false);
        if (onEditorInit) onEditorInit(editor);

        // --- CUSTOM BLOCKS ---
        editor.BlockManager.add("analysis-screen-16s", {
          label: "Análise 16s",
          category: "Componentes Extras",
          content: `
            <div style="padding: 60px 20px; text-align: center; font-family: system-ui, sans-serif;">
              <h2 style="color: #16a34a; font-size: 24px; margin-bottom: 24px;">Analisando suas respostas...</h2>
              <div style="max-width: 400px; margin: 0 auto; background: #e5e7eb; height: 16px; border-radius: 8px; overflow: hidden; position: relative;">
                <div class="analysis-bar" style="background: #16a34a; width: 0%; height: 100%; transition: width 1s linear;"></div>
              </div>
              <p class="analysis-status-text" style="color: #6b7280; margin-top: 16px; font-size: 14px;">
                Nossa IA está processando suas respostas...
              </p>
              
              <!-- Este script vai rodar na página final gerada -->
              <script>
                // Executa apenas quando não estiver sendo editado pelo GrapesJS
                if (typeof window !== "undefined" && !window.editor) {
                  const bar = document.currentScript.parentElement.querySelector('.analysis-bar');
                  const textEl = document.currentScript.parentElement.querySelector('.analysis-status-text');
                  
                  if (bar) {
                    let progress = 0;
                    const durationSeconds = 16;
                    const step = 100 / durationSeconds;
                    
                    const interval = setInterval(() => {
                      progress += step;
                      if (progress >= 100) {
                        progress = 100;
                        clearInterval(interval);
                        if (textEl) textEl.innerHTML = "Análise concluída! Redirecionando...";
                        // Aqui você pode disparar algum evento se necessário
                      }
                      bar.style.width = progress + '%';
                    }, 1000);
                  }
                }
              </script>
            </div>
          `
        });


        // Auto-save on any meaningful change
        let saveTimer: ReturnType<typeof setTimeout>;
        const save = () => {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            if (!editorRef.current) return;
            const html = editorRef.current.getHtml({ cleanId: true });
            const css = editorRef.current.getCss({ avoidProtected: true });
            updatePage(pageId, { html, css, updatedAt: Date.now() });
          }, 600);
        };

        editor.on("component:update", save);
        editor.on("component:add", save);
        editor.on("component:remove", save);
        editor.on("style:update", save);
        editor.on("asset:update", save);
      } catch (err) {
        console.error("GrapesJS init error:", err);
        setLoading(false);
      }
    })();

    return () => {
      destroyed = true;
      if (editorRef.current) {
        try { editorRef.current.destroy(); } catch (_) {}
        editorRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  return (
    <div style={{ height: "100%", position: "relative", background: "#09090b" }}>
      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          zIndex: 10,
          color: "#a1a1aa",
          gap: "12px",
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span style={{ fontSize: "13px" }}>Carregando editor...</span>
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%", opacity: loading ? 0 : 1 }} />
    </div>
  );
}
