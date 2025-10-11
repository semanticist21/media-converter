import {Footer} from "@/components/footer/footer";
import {Toolbar} from "@/components/header/toolbar";
import {Main} from "@/components/main/main";
import {Toaster} from "@/components/ui/sonner";
import {FileListProvider} from "@/hooks/use-file-list";
import "./index.css";

export default function App() {
  return (
    <FileListProvider>
      <div className="flex h-screen flex-col">
        <Toolbar />
        <Main />
        <Footer />
      </div>
      <Toaster position="top-center" />
    </FileListProvider>
  );
}
