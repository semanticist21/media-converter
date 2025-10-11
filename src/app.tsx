import {Footer} from "@/components/footer/footer";
import {Toolbar} from "@/components/header/toolbar";
import {Main} from "@/components/main/main";
import "./index.css";

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <Toolbar />
      <Main />
      <Footer />
    </div>
  );
}
