import {Footer} from "@/components/layout/footer";
import {Main} from "@/components/layout/main";
import {Toolbar} from "@/components/toolbar";
import "./index.css";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Toolbar />
      <Main />
      <Footer />
    </div>
  );
}
