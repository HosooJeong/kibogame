import { useEffect, useRef, useState } from "react";
import { DIFFICULTIES } from "../game/difficulties";
import { STAGES, stagesInDifficulty } from "../game/stages";
import type { Difficulty, Stage } from "../game/types";
import type { GameController, GameState, Mode } from "../game/controller";
import { CommandIcon, SoundIcon, StarIcon } from "./Icons";

function MapPreview({ stage }: { stage: Stage }) {
  const tile = 48 / stage.size;
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      {Array.from({ length: stage.size * stage.size }, (_, i) => {
        const x = i % stage.size,
          y = Math.floor(i / stage.size);
        const blocked = stage.obstacles.some((p) => p.x === x && p.y === y);
        return (
          <rect
            key={i}
            x={4 + x * tile}
            y={4 + y * tile}
            width={tile - 1}
            height={tile - 1}
            rx="1.2"
            fill={blocked ? "#d6c5af" : "#dceade"}
          />
        );
      })}
      <circle
        cx={4 + (stage.start.x + 0.5) * tile}
        cy={4 + (stage.start.y + 0.5) * tile}
        r="3.3"
        fill="#4a8e78"
      />
      <circle
        cx={4 + (stage.goal.x + 0.5) * tile}
        cy={4 + (stage.goal.y + 0.5) * tile}
        r="3.3"
        fill="#dcad40"
      />
    </svg>
  );
}

export function PlayMenu({
  game,
  state,
  open,
  onClose,
  soundEnabled,
  toggleSound,
  storageFailed,
}: {
  game: GameController;
  state: GameState;
  open: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  storageFailed: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    game.stage.difficulty!,
  );
  useEffect(() => {
    if (open) {
      setDifficulty(game.stage.difficulty!);
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open, game]);
  const chooseMode = (mode: Mode) => {
    game.setMode(mode);
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="play-menu"
      onClose={onClose}
      aria-labelledby="menu-title"
    >
      <div className="menu-heading">
        <h2 id="menu-title">어떤 놀이 할까?</h2>
        <button
          className="icon-button"
          aria-label="메뉴 닫기"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="mode-switch" role="group" aria-label="놀이 방법">
        <button
          className={state.mode === "direct" ? "active" : ""}
          aria-pressed={state.mode === "direct"}
          onClick={() => chooseMode("direct")}
        >
          <CommandIcon command="forward" size={25} />
          직접 움직이기
        </button>
        <button
          className={state.mode === "code" ? "active" : ""}
          aria-pressed={state.mode === "code"}
          onClick={() => chooseMode("code")}
        >
          <span aria-hidden="true">▰ ▰ ▰</span>순서 만들기
        </button>
      </div>
      <div className="difficulty-list" role="group" aria-label="난이도 고르기">
        {DIFFICULTIES.map((item) => (
          <button
            key={item.id}
            className={difficulty === item.id ? "chosen" : ""}
            aria-pressed={difficulty === item.id}
            onClick={() => setDifficulty(item.id)}
            style={{ "--tier-color": item.color } as React.CSSProperties}
            aria-label={`${item.id}단계 ${item.name}`}
          >
            <span className="difficulty-number">{item.id}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="map-section-heading">
        <strong>{DIFFICULTIES[difficulty - 1].name}</strong>
        <span>
          <StarIcon size={16} />
          {
            stagesInDifficulty(difficulty).filter((s) =>
              state.cleared.includes(s.id),
            ).length
          }{" "}
          / {stagesInDifficulty(difficulty).length}
        </span>
      </div>
      <div className="map-list" aria-label="놀이 고르기">
        {stagesInDifficulty(difficulty).map((stage) => (
          <button
            key={stage.id}
            className={`map-choice ${game.stage.id === stage.id ? "selected" : ""}`}
            aria-label={`${difficulty}-${stage.ordinal} 놀이${state.cleared.includes(stage.id) ? ", 별 찾음" : ""}`}
            aria-current={game.stage.id === stage.id ? "step" : undefined}
            onClick={() => {
              game.selectStage(STAGES.indexOf(stage));
              onClose();
            }}
          >
            <MapPreview stage={stage} />
            <span>{stage.ordinal}</span>
            {state.cleared.includes(stage.id) && (
              <StarIcon size={16} className="map-cleared" />
            )}
          </button>
        ))}
      </div>
      <div className="menu-bottom">
        <button
          className="sound-button"
          onClick={toggleSound}
          aria-label={soundEnabled ? "소리 끄기" : "소리 켜기"}
          aria-pressed={soundEnabled}
        >
          <SoundIcon enabled={soundEnabled} />
          {soundEnabled ? "소리 켜짐" : "소리 꺼짐"}
        </button>
        {state.mode === "direct" && state.history.length > 0 && (
          <button
            className="copy-button"
            disabled={state.busy || state.history.length > 20}
            onClick={() => {
              game.copyHistory();
              onClose();
            }}
          >
            이 순서로 코딩하기
          </button>
        )}
      </div>
      {state.history.length > 20 && state.mode === "direct" && (
        <p className="menu-note">20개까지 옮길 수 있어. 처음부터 해볼까?</p>
      )}
      {storageFailed && (
        <p className="menu-note" role="status">
          기록을 저장하지 못했어.
        </p>
      )}
    </dialog>
  );
}
