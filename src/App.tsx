import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GameController } from "./game/controller";
import { GameSound } from "./game/sound";
import { readSaved, writeSaved } from "./game/storage";
import { nextStageIndex } from "./game/stages";
import { DIFFICULTIES } from "./game/difficulties";
import { COMMAND_LABELS, MAX_COMMANDS } from "./game/types";
import type { Command } from "./game/types";
import { CommandIcon, ResetIcon, StarIcon } from "./ui/Icons";
import { GameWorld } from "./ui/GameWorld";
import { PlayMenu } from "./ui/PlayMenu";

const BUTTON_ORDER: Command[] = ["left", "forward", "backward", "right"];
export default function App() {
  const [saved] = useState(readSaved);
  const [game] = useState(() => new GameController(saved.cleared));
  const [sound] = useState(() => new GameSound(saved.sound));
  const [soundEnabled, setSoundEnabled] = useState(saved.sound);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const state = useSyncExternalStore(game.subscribe, game.getSnapshot);
  const listRef = useRef<HTMLDivElement>(null);
  const stage = game.stage;
  const isCode = state.mode === "code";
  const cards = isCode ? state.commands : state.history;
  const meta = DIFFICULTIES[stage.difficulty! - 1];

  useEffect(() => {
    game.onSound = sound.play;
    return () => {
      game.onSound = () => {};
    };
  }, [game, sound]);
  useEffect(() => {
    setStorageFailed(
      !writeSaved({ sound: soundEnabled, cleared: state.cleared }),
    );
  }, [soundEnabled, state.cleared]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        menuOpen ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)))
      )
        return;
      const mapping: Record<string, Command> = {
        ArrowUp: "forward",
        ArrowDown: "backward",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      if (mapping[event.key]) {
        event.preventDefault();
        if (!event.repeat && ready) {
          sound.unlock();
          game.input(mapping[event.key]);
        }
      }
      if (
        event.key.toLowerCase() === "f" &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
        else
          void document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [game, sound, ready, menuOpen]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const index =
      isCode && state.activeIndex !== null
        ? state.activeIndex
        : cards.length - 1;
    const card = list.children[index] as HTMLElement | undefined;
    if (card) {
      const left =
        card.getBoundingClientRect().left -
        list.getBoundingClientRect().left +
        list.scrollLeft;
      if (
        left < list.scrollLeft ||
        left + card.offsetWidth > list.scrollLeft + list.clientWidth
      )
        list.scrollTo({
          left: Math.max(0, left - list.clientWidth / 2 + card.offsetWidth / 2),
          behavior: "instant",
        });
    }
  }, [state.activeIndex, cards.length, isCode]);
  function toggleSound() {
    sound.enabled = !soundEnabled;
    setSoundEnabled(sound.enabled);
    if (sound.enabled) {
      sound.unlock();
      sound.play("add");
    }
  }
  const disabled =
    !ready ||
    state.busy ||
    (!isCode && state.won) ||
    (isCode && cards.length >= MAX_COMMANDS);
  function openMenu() {
    if (state.playing) game.stop();
    setMenuOpen(true);
  }
  return (
    <div
      className={`app-shell ${isCode ? "coding" : "direct"} ${state.won ? "celebrating" : ""}`}
      onPointerDown={sound.unlock}
      onKeyDownCapture={sound.unlock}
    >
      <header className="play-header">
        <button
          className="icon-button menu-button"
          onClick={openMenu}
          aria-label="놀이 메뉴"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 6h14M5 12h14M5 18h14" />
          </svg>
        </button>
        <h1>
          <span className="stage-dot" style={{ background: meta.color }} />
          {meta.name}
          <span className="stage-label">{stage.ordinal}</span>
        </h1>
        <button
          className="icon-button reset-button"
          onClick={game.reset}
          aria-label="처음부터"
          title="처음부터"
        >
          <ResetIcon />
        </button>
      </header>
      <main className="play-area" aria-label="별 찾기 놀이">
        <div className="playground">
          <GameWorld game={game} onReady={setReady} />
        </div>
        <div
          className={`world-message ${state.failure ? "bump" : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.failure ? (
            <div className="failure-message" data-failure={state.failure}>
              <strong>별에 닿지 못했어</strong>
              <span>{state.message}</span>
            </div>
          ) : state.won ? "별을 찾았어!" : state.message || "한 걸음, 좋아!"}
        </div>
      </main>
      {state.won && (
        <aside className="success-panel" aria-label="별을 찾았어">
          <StarIcon size={31} />
          <button
            className="primary next-button"
            onClick={() => game.selectStage(nextStageIndex(state.stageIndex))}
          >
            다음 놀이 <span aria-hidden="true">→</span>
          </button>
          {!isCode && cards.length <= MAX_COMMANDS && (
            <button className="success-copy" onClick={game.copyHistory}>
              이 순서로 코딩하기
            </button>
          )}
        </aside>
      )}
      <section className="controls" aria-label="또또 움직이기">
        <div className={`sequence-row ${isCode ? "" : "history-row"}`}>
          <div
            ref={listRef}
            className={`command-list ${isCode ? "editable" : "history"}`}
            aria-label={isCode ? "실행할 명령" : "지나온 명령"}
          >
            {cards.map((command, index) => {
              const active = isCode && state.activeIndex === index,
                failed = isCode && state.failedIndex === index;
              const contents = (
                <>
                  <CommandIcon command={command} size={isCode ? 27 : 21} />
                  {isCode && (
                    <>
                      <span className="card-number">{index + 1}</span>
                      <span className="card-delete" aria-hidden="true">
                        ×
                      </span>
                    </>
                  )}
                </>
              );
              const className = `command-card ${command} ${active ? "current" : ""} ${failed ? "failed" : ""}`;
              return isCode ? (
                <button
                  key={index}
                  className={className}
                  disabled={state.busy}
                  aria-label={`${index + 1}번째 ${COMMAND_LABELS[command]} 지우기`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => game.remove(index)}
                >
                  {contents}
                </button>
              ) : (
                <span
                  key={index}
                  className={className}
                  aria-label={COMMAND_LABELS[command]}
                >
                  {contents}
                </span>
              );
            })}
            {isCode && !cards.length && (
              <span className="empty-sequence">
                아래 버튼으로 순서를 만들어 봐.
              </span>
            )}
          </div>
          {isCode && (
            <>
              <span className="card-count">{cards.length}/20</span>
              <button
                className="icon-button clear-button"
                aria-label="모두 지우기"
                title="모두 지우기"
                disabled={state.busy || !cards.length}
                onClick={game.clear}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />
                </svg>
              </button>
            </>
          )}
        </div>
        <div className="action-row">
          <div className="movement-buttons">
            {BUTTON_ORDER.map((command) => (
              <button
                key={command}
                className={`move-button ${command}`}
                disabled={disabled}
                onClick={() => game.input(command)}
                data-command={command}
              >
                <CommandIcon command={command} size={36} />
                <span>{COMMAND_LABELS[command]}</span>
              </button>
            ))}
          </div>
          {isCode &&
            (state.playing ? (
              <button
                className="run-button stop-button"
                disabled={state.stopRequested}
                onClick={game.stop}
              >
                <span className="stop-icon" />
                {state.stopRequested ? "멈추는 중" : "멈추기"}
              </button>
            ) : (
              <button
                className={`run-button ${state.failure ? "retry-button" : ""}`}
                disabled={!ready || state.busy || !cards.length}
                onClick={game.run}
              >
                {state.failure ? <ResetIcon /> : <span className="play-icon" />}
                {state.failure ? "다시 실행" : "실행"}
              </button>
            ))}
        </div>
      </section>
      <PlayMenu
        game={game}
        state={state}
        open={menuOpen}
        onClose={closeMenu}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        storageFailed={storageFailed}
      />
    </div>
  );
}
