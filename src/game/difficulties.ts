import type { Difficulty } from "./types";
export const DIFFICULTIES: {
  id: Difficulty;
  name: string;
  hint: string;
  color: string;
}[] = [
  {
    id: 1,
    name: "한 걸음",
    hint: "앞으로 꾹! 별까지 가 보자.",
    color: "#86b398",
  },
  { id: 2, name: "빙글", hint: "몸을 돌려 별을 찾아봐.", color: "#85afbf" },
  { id: 3, name: "꼬불꼬불", hint: "돌고, 또 돌아볼까?", color: "#b4a5c6" },
  { id: 4, name: "블록 사이", hint: "블록 옆으로 쏙!", color: "#d3aa7d" },
  {
    id: 5,
    name: "뒤로 쏙",
    hint: "몸은 그대로, 뒤로 가 봐.",
    color: "#8bafad",
  },
  { id: 6, name: "별 모험", hint: "나만의 길을 만들어 봐.", color: "#c5a35e" },
];
