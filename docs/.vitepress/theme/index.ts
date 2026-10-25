import DefaultTheme from "vitepress/theme";
import MermaidDiagram from "./components/MermaidDiagram.vue";
import TeaserMarquee from "./components/TeaserMarquee.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Target of the ```mermaid fence hook in config.mts.
    app.component("MermaidDiagram", MermaidDiagram);
    // Used by docs/games.md - the lobby's pixel art, imported from the hub.
    app.component("TeaserMarquee", TeaserMarquee);
  }
};
