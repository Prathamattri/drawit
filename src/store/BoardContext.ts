import { createContext } from "react";

export const BoardContext = createContext({
	zoom: 1,
	zoomOffset: { x: 0, y: 0 },
	panOffset: { x: 0, y: 0 },
	isDrawing: false,
	isErasing: false,
	tool: 0,
});

