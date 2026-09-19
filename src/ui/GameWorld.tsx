import { useEffect, useRef, useState } from "react";
import type { GameController } from "../game/controller";
import { RobotIcon } from "./Icons";
import type { World } from "../world/World";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
    game_world_bounds?: () => { x: number; y: number }[];
    game_world_view?: () => {
      robot: { x: number; y: number };
      north: { x: number; y: number };
      east: { x: number; y: number };
      camera: number[];
      stoppedTile: { x: number; y: number } | null;
    };
  }
}

export function GameWorld({
  game,
  onReady,
}: {
  game: GameController;
  onReady: (ready: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  useEffect(() => {
    let world: World | undefined,
      cancelled = false;
    window.render_game_to_text = game.toText;
    import("../world/World")
      .then(({ World }) => {
        if (cancelled || !ref.current) return;
        try {
          world = new World(ref.current, game, () => {
            setStatus("error");
            onReady(false);
            game.reset();
          });
          window.advanceTime = world.advanceTime;
          window.game_world_bounds = world.bounds;
          window.game_world_view = world.view;
          setStatus("ready");
          onReady(true);
        } catch {
          setStatus("error");
          onReady(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          onReady(false);
        }
      });
    return () => {
      cancelled = true;
      world?.dispose();
      delete window.advanceTime;
      delete window.render_game_to_text;
      delete window.game_world_bounds;
      delete window.game_world_view;
    };
  }, [game, onReady]);
  return (
    <>
      <canvas
        ref={ref}
        className="world-canvas"
        aria-label="별을 찾아가는 또또의 입체 놀이판"
        role="img"
        data-ready={status === "ready"}
      />
      {status !== "ready" && (
        <div className="world-fallback" role="status">
          <RobotIcon size={58} />
          <strong>
            {status === "loading"
              ? "또또가 나오고 있어…"
              : "놀이판을 열지 못했어."}
          </strong>
          {status === "error" && (
            <>
              <p>새로 열어 볼까? 계속 안 되면 다른 브라우저로 와 줘.</p>
              <button
                className="primary"
                onClick={() => window.location.reload()}
              >
                다시 열기
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
