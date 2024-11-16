import { ReactNode, useState } from "react";
import { BoardContext } from "./BoardContext";
import { PointerContext } from "./PointerContext";

function ContextProvider({ children }: { children: ReactNode }) {
	const [board, _setBoard] = useState({
		zoom: 1,
		zoomOffset: { x: 0, y: 0 },
		panOffset: { x: 0, y: 0 },
		isDrawing: false,
		isErasing: false,
		tool: 0,
	})

	const [pointer, _setPointer] = useState({ x: 0, y: 0 })

	return (
		<BoardContext.Provider value={board}>
			<PointerContext.Provider value={pointer}>
				{children}
			</PointerContext.Provider>
		</BoardContext.Provider>
	)
}

export default ContextProvider;
