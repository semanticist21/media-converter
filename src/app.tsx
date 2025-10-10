import {Toolbar} from "@/components/toolbar";
import "./index.css";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Toolbar />
      <main className="flex-1 p-4">{/* Main content will go here */}</main>
    </div>
  );
}
