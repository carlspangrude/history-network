import DetailsPanel from "./components/DetailsPanel";
import GraphCanvas from "./components/GraphCanvas";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";

function App() {
  return (
    <div className="app">
      <Header />

      <main className="main">
        <Sidebar />
        <GraphCanvas />
        <DetailsPanel />
      </main>

      <Timeline />
    </div>
  );
}

export default App;