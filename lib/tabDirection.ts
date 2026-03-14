export let tabAnimation: "slide_from_right" | "slide_from_left" = "slide_from_right";

export function setTabAnimation(dir: "slide_from_right" | "slide_from_left") {
  tabAnimation = dir;
}
