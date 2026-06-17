import { useRef, useEffect } from "react";
import { buildDocument } from "@/lib/page-store";
import type { Block } from "@/lib/page-types";

interface Props {
  blocks: Block[];
  css: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  viewport: "desktop" | "tablet" | "mobile";
}

const widths = { desktop: "100%", tablet: "768px", mobile: "390px" };

export function CanvasFrame({ blocks, css, selectedId, onSelect, viewport }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const doc = buildDocument(blocks, css);
    const injected = doc.replace("</body>", `
<style>
[data-lb-id]{outline:1px dashed transparent;outline-offset:-1px;transition:outline-color .1s}
[data-lb-id]:hover{outline-color:#a78bfa}
[data-lb-id].__lb-selected{outline:2px solid #8b5cf6 !important}
</style>
<script>
(function(){
  document.addEventListener('click',function(e){
    e.preventDefault(); e.stopPropagation();
    var el=e.target.closest('[data-lb-id]');
    document.querySelectorAll('.__lb-selected').forEach(function(n){n.classList.remove('__lb-selected')});
    if(el){ el.classList.add('__lb-selected'); parent.postMessage({type:'lb-select',id:el.getAttribute('data-lb-id')},'*'); }
    else { parent.postMessage({type:'lb-select',id:null},'*'); }
  },true);
  window.addEventListener('message',function(e){
    if(e.data && e.data.type==='lb-highlight'){
      document.querySelectorAll('.__lb-selected').forEach(function(n){n.classList.remove('__lb-selected')});
      if(e.data.id){ var n=document.querySelector('[data-lb-id="'+e.data.id+'"]'); if(n) n.classList.add('__lb-selected'); }
    }
  });
})();
</script>
</body>`);
    iframe.srcdoc = injected;
  }, [blocks, css]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "lb-select") onSelect(e.data.id ?? null);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSelect]);

  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: "lb-highlight", id: selectedId }, "*");
  }, [selectedId]);

  return (
    <div className="flex-1 bg-zinc-900 overflow-auto grid place-items-start justify-center p-6">
      <iframe
        ref={ref}
        title="canvas"
        sandbox="allow-same-origin allow-scripts"
        className="bg-white shadow-2xl rounded-md transition-all"
        style={{ width: widths[viewport], minHeight: "80vh", border: "none" }}
      />
    </div>
  );
}
