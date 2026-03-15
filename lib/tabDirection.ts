// Tab direction tracking (used by tab bar indicator)
export let tabDirection: "right" | "left" = "right";

export function setTabDirection(dir: "right" | "left") {
  tabDirection = dir;
}
