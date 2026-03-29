import React from "react";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";

export type DentalIconName =
  | "tooth"
  | "tooth-implant"
  | "tooth-crown"
  | "tooth-sparkle"
  | "tooth-veneer"
  | "smile"
  | "tooth-fill"
  | "tooth-root"
  | "braces"
  | "tooth-extract"
  | "tooth-gum"
  | "tooth-sleep"
  | "tooth-scissors"
  | "tooth-check"
  | "tooth-shield"
  | "tooth-search"
  | "dental-chair"
  | "dentist"
  | "tooth-clipboard"
  | "tooth-xray"
  | "tooth-plus";

interface DentalIconProps {
  name: DentalIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

const TOOTH =
  "M22.5 13C17.5 13 13 17 13 22.5c0 4.2 1.8 7.5 3.2 11 1.8 4.2 3.2 8.8 4 13.5.6 3.2 1.8 4.5 4 4.5s3-1.5 3.8-4.5c.7-2.5 1.2-4.8 1.7-6.5.3-1.2.8-1.8 1.8-1.8h1.2c1 0 1.5.6 1.8 1.8.5 1.7 1 4 1.7 6.5.8 3 1.5 4.5 3.8 4.5s3.4-1.3 4-4.5c.8-4.7 2.2-9.3 4-13.5 1.4-3.5 3.2-6.8 3.2-11 0-5.5-4.5-9.5-9.5-9.5-2.8 0-5 1-6.5 3.2-.7 1-1.2 1.5-2.2 1.5s-1.5-.5-2.2-1.5C30 14 27.8 13 25 13h-2.5z";

const TOOTH_SM =
  "M20 22c-3.5 0-6 2.5-6 5.5 0 2 .8 3.5 1.5 5.5 1 2.5 2 5.5 2.5 8.5.4 2.2 1 3 2.5 3s1.8-1 2.3-3c.4-1.5.8-2.8 1.1-4 .2-.7.4-1 1-1h1.2c.6 0 .8.3 1 1 .3 1.2.7 2.5 1.1 4 .5 2 .8 3 2.3 3s2.1-.8 2.5-3c.5-3 1.5-6 2.5-8.5.7-2 1.5-3.5 1.5-5.5 0-3-2.5-5.5-6-5.5-1.5 0-2.8.5-3.5 1.7-.4.6-.6.8-1.2.8h-1.2c-.6 0-.8-.2-1.2-.8C23 22.5 21.5 22 20 22z";

const TOOTH_MID =
  "M24 16c-4.5 0-8 3.2-8 7.5 0 3.2 1.3 5.8 2.5 8.5 1.5 3.5 2.8 7.2 3.5 11.5.5 2.8 1.5 4 3.5 4s2.5-1.5 3-3.8c.5-2 1-4 1.5-5.5.3-1 .6-1.5 1.3-1.5h1c.7 0 1 .5 1.3 1.5.5 1.5 1 3.5 1.5 5.5.5 2.3 1 3.8 3 3.8s3-1.2 3.5-4c.7-4.3 2-8 3.5-11.5 1.2-2.7 2.5-5.3 2.5-8.5 0-4.3-3.5-7.5-8-7.5-2.2 0-4 .8-5.2 2.5-.6.8-1 1.2-1.8 1.2h-1c-.8 0-1.2-.4-1.8-1.2C28 16.8 26.2 16 24 16z";

const TOOTH_ROOT_OUTLINE =
  "M24 12c-4.5 0-8 3.2-8 7.5 0 3.2 1.3 5.8 2.5 8.5 1.5 3.5 2.8 7.2 3.5 11.5.5 2.8 1.5 4 3.5 4s2.5-1.5 3-3.8c.5-2 1-4 1.5-5.5.3-1 .6-1.5 1.3-1.5h1c.7 0 1 .5 1.3 1.5.5 1.5 1 3.5 1.5 5.5.5 2.3 1 3.8 3 3.8s3-1.2 3.5-4c.7-4.3 2-8 3.5-11.5 1.2-2.7 2.5-5.3 2.5-8.5 0-4.3-3.5-7.5-8-7.5-2.2 0-4 .8-5.2 2.5-.6.8-1 1.2-1.8 1.2h-1c-.8 0-1.2-.4-1.8-1.2C28 12.8 26.2 12 24 12z";

export function DentalIcon({ name, size = 24, color = "#000", strokeWidth = 1.8 }: DentalIconProps) {
  const sw = strokeWidth;
  const lc = "round" as const;
  const lj = "round" as const;
  const props = { width: size, height: size, viewBox: "0 0 64 64", fill: "none" };

  switch (name) {
    case "tooth":
      return (
        <Svg {...props}>
          <Path d={TOOTH} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
        </Svg>
      );

    case "tooth-implant":
      return (
        <Svg {...props}>
          <Path d="M24 8c-3.5 0-6 2.5-6 6 0 2.5 1 4.2 2 6.5.8 2 1.5 4.2 2 6.5" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M40 8c3.5 0 6 2.5 6 6 0 2.5-1 4.2-2 6.5-.8 2-1.5 4.2-2 6.5" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M24 8c2 0 3.8.8 5 2.5.6.8 1 1.2 1.8 1.2h2.4c.8 0 1.2-.4 1.8-1.2C36.2 8.8 38 8 40 8" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M26 27h12" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Path d="M28 27v4h8v-4" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M28 31l-1 4h10l-1-4" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Line x1="28" y1="38" x2="36" y2="38" stroke={color} strokeWidth={sw * 0.89} strokeLinecap={lc} />
          <Line x1="29" y1="42" x2="35" y2="42" stroke={color} strokeWidth={sw * 0.89} strokeLinecap={lc} />
          <Line x1="30" y1="46" x2="34" y2="46" stroke={color} strokeWidth={sw * 0.89} strokeLinecap={lc} />
          <Line x1="31" y1="50" x2="33" y2="50" stroke={color} strokeWidth={sw * 0.78} strokeLinecap={lc} />
          <Path d="M27 35l10 0" stroke={color} strokeWidth={sw * 0.78} strokeLinecap={lc} />
        </Svg>
      );

    case "tooth-crown":
      return (
        <Svg {...props}>
          <Path d="M21 20l-1.5-8 5.5 4.5L32 9l7 7.5 5.5-4.5L43 20" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Line x1="21" y1="20" x2="43" y2="20" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Circle cx="32" cy="16" r="1.2" fill={color} />
          <Path d="M22 24c-2.5 0-4.5 2-4.5 4.5 0 2 .8 3.8 1.8 6 1.2 2.8 2.2 6 2.8 9.5.5 2.5 1.3 3.5 3 3.5s2.2-1 2.8-3.5c.5-2 1-3.8 1.3-5 .2-.8.5-1.2 1.2-1.2h3.2c.7 0 1 .4 1.2 1.2.3 1.2.8 3 1.3 5 .6 2.5 1.2 3.5 2.8 3.5s2.5-1 3-3.5c.6-3.5 1.6-6.7 2.8-9.5 1-2.2 1.8-4 1.8-6 0-2.5-2-4.5-4.5-4.5" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
        </Svg>
      );

    case "tooth-sparkle":
    case "tooth-veneer":
      return (
        <Svg {...props}>
          <Path d={TOOTH_MID} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M49 12l1.2 3.2 3.2 1.2-3.2 1.2L49 20.8l-1.2-3.2L44.6 16.4l3.2-1.2z" fill={color} opacity={0.9} />
          <Path d="M11 10l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill={color} opacity={0.55} />
          <Path d="M52 26l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill={color} opacity={0.4} />
        </Svg>
      );

    case "smile":
      return (
        <Svg {...props}>
          <Path d="M10 33 C12 30, 16 28, 22 28 C25 28, 27 30, 29 31.5 C30 32, 31 32.5, 32 32.5 C33 32.5, 34 32, 35 31.5 C37 30, 39 28, 42 28 C48 28, 52 30, 54 33" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M10 33 C12 40, 20 45, 32 45 C44 45, 52 40, 54 33" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Rect x="19" y="33" width="26" height="7" rx="0.5" stroke={color} strokeWidth={sw * 0.72} />
          <Line x1="23.3" y1="33" x2="23.3" y2="40" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} />
          <Line x1="27.6" y1="33" x2="27.6" y2="40" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} />
          <Line x1="32" y1="33" x2="32" y2="40" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} />
          <Line x1="36.4" y1="33" x2="36.4" y2="40" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} />
          <Line x1="40.7" y1="33" x2="40.7" y2="40" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} />
        </Svg>
      );

    case "tooth-fill":
      return (
        <Svg {...props}>
          <Path d={TOOTH_MID} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M27.5 20c-1.2 0-2 .8-2 2v5c0 1 .7 1.5 1.5 1.5h10c.8 0 1.5-.5 1.5-1.5v-5c0-1.2-.8-2-2-2" stroke={color} strokeWidth={sw * 0.89} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M27.5 20c-1.2 0-2 .8-2 2v5c0 1 .7 1.5 1.5 1.5h10c.8 0 1.5-.5 1.5-1.5v-5c0-1.2-.8-2-2-2" fill={color} opacity={0.12} />
        </Svg>
      );

    case "tooth-root":
      return (
        <Svg {...props}>
          <Path d={TOOTH_ROOT_OUTLINE} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Line x1="16" y1="30" x2="48" y2="30" stroke={color} strokeWidth={sw * 0.56} strokeDasharray="2.5 2" opacity={0.25} />
          <Path d="M28 30c0 0-.5 5-1.5 9-.6 2.2-1.2 3.5-1.5 5" stroke={color} strokeWidth={sw * 1.11} strokeLinecap={lc} />
          <Path d="M36 30c0 0 .5 5 1.5 9 .6 2.2 1.2 3.5 1.5 5" stroke={color} strokeWidth={sw * 1.11} strokeLinecap={lc} />
        </Svg>
      );

    case "braces":
      return (
        <Svg {...props}>
          <Path d={TOOTH_MID} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Line x1="14" y1="27" x2="50" y2="27" stroke={color} strokeWidth={sw * 0.83} strokeLinecap={lc} />
          <Rect x="22" y="24" width="4.5" height="6" rx="1" stroke={color} strokeWidth={sw * 0.72} fill={color} fillOpacity={0.1} />
          <Rect x="29.8" y="24" width="4.5" height="6" rx="1" stroke={color} strokeWidth={sw * 0.72} fill={color} fillOpacity={0.1} />
          <Rect x="37.5" y="24" width="4.5" height="6" rx="1" stroke={color} strokeWidth={sw * 0.72} fill={color} fillOpacity={0.1} />
        </Svg>
      );

    case "tooth-extract":
      return (
        <Svg {...props}>
          <Path d="M23 24c-3.5 0-6 2.5-6 6 0 2 .8 3.5 1.8 5.5 1 2.5 2 5.5 2.5 8.5.4 2.2 1.2 3 2.5 3s2-1 2.5-3c.4-1.5.8-2.8 1.1-4 .2-.7.4-1 1-1h2.2c.6 0 .8.3 1 1 .3 1.2.7 2.5 1.1 4 .5 2 1 3 2.5 3s2.1-0.8 2.5-3c.5-3 1.5-6 2.5-8.5 1-2 1.8-3.5 1.8-5.5 0-3.5-2.5-6-6-6-1.5 0-2.8.5-3.5 1.7-.4.6-.7.8-1.2.8h-1.6c-.5 0-.8-.2-1.2-.8C26 24.5 24.5 24 23 24z" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M32 20V8" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Path d="M27.5 12.5L32 8l4.5 4.5" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
        </Svg>
      );

    case "tooth-gum":
      return (
        <Svg {...props}>
          <Path d="M8 28q5-5 10-5t8 5q3 5 6 5t6-5q3-5 6-5t8 5q3 5 6 5t6-5" stroke={color} strokeWidth={sw} strokeLinecap={lc} fill="none" />
          <Path d="M25 28v-8c0-3.5 2.5-6 7-6s7 2.5 7 6v8" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M27 28c0 0-.5 5-1.5 9s-1.5 6-1.5 8" stroke={color} strokeWidth={sw * 0.89} strokeLinecap={lc} />
          <Path d="M37 28c0 0 .5 5 1.5 9s1.5 6 1.5 8" stroke={color} strokeWidth={sw * 0.89} strokeLinecap={lc} />
        </Svg>
      );

    case "tooth-sleep":
      return (
        <Svg {...props}>
          <Path d="M12 28c0-3 8-8 20-8s20 5 20 8" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M12 28c0 5 8 10 20 10s20-5 20-10" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M18 28c0-1.5 5.5-4 14-4s14 2.5 14 4" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} opacity={0.3} />
          <Path d="M18 28c0 2.5 5.5 5 14 5s14-2.5 14-5" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} opacity={0.3} />
          <Path d="M46 12h5l-5 5h5" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M52 7h3.5l-3.5 3.5h3.5" stroke={color} strokeWidth={sw * 0.78} strokeLinecap={lc} strokeLinejoin={lj} opacity={0.5} />
        </Svg>
      );

    case "tooth-scissors":
      return (
        <Svg {...props}>
          <Path d="M24 44l12-22" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Path d="M40 44l-12-22" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Circle cx="22" cy="48" r="5" stroke={color} strokeWidth={sw} />
          <Circle cx="42" cy="48" r="5" stroke={color} strokeWidth={sw} />
          <Circle cx="32" cy="32" r="2" fill={color} opacity={0.2} />
          <Line x1="28" y1="18" x2="36" y2="18" stroke={color} strokeWidth={sw * 0.83} strokeDasharray="2 2.5" strokeLinecap={lc} />
        </Svg>
      );

    case "tooth-check":
      return (
        <Svg {...props}>
          <Path d={TOOTH_SM} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Circle cx="48" cy="16" r="9.5" stroke={color} strokeWidth={sw} fill={color} fillOpacity={0.05} />
          <Path d="M43 16l3.5 3.5L52 13" stroke={color} strokeWidth={sw * 1.11} strokeLinecap={lc} strokeLinejoin={lj} />
        </Svg>
      );

    case "tooth-shield":
      return (
        <Svg {...props}>
          <Path d="M32 6L12 15v14c0 15 20 27 20 27s20-12 20-27V15L32 6z" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M28 24c-2 0-3.5 1.5-3.5 3.5 0 1.2.5 2 1 3.2.6 1.5 1 3.2 1.2 5 .2 1 .5 1.5 1.5 1.5s1-.5 1.2-1.5c.2-.8.4-1.8.6-2.5.1-.4.3-.6.6-.6h2.8c.3 0 .5.2.6.6.2.7.4 1.7.6 2.5.2 1 .5 1.5 1.2 1.5s1.3-.5 1.5-1.5c.2-1.8.6-3.5 1.2-5 .5-1.2 1-2 1-3.2 0-2-1.5-3.5-3.5-3.5-.8 0-1.5.3-2 .8-.3.4-.5.5-.8.5h-1.4c-.3 0-.5-.1-.8-.5-.5-.5-1.2-.8-2-.8z" stroke={color} strokeWidth={sw * 0.83} strokeLinecap={lc} strokeLinejoin={lj} />
        </Svg>
      );

    case "tooth-search":
      return (
        <Svg {...props}>
          <Path d="M18 16c-3 0-5 2-5 5 0 1.8.6 3 1.2 4.5.8 2 1.6 4.5 2 7 .3 1.8.8 2.5 2 2.5s1.6-.8 2-2.5c.3-1.2.6-2.5.8-3.5.15-.6.35-.8.8-.8h1c.45 0 .65.2.8.8.2 1 .5 2.3.8 3.5.4 1.7.8 2.5 2 2.5s1.7-.7 2-2.5c.4-2.5 1.2-5 2-7 .6-1.5 1.2-2.7 1.2-4.5 0-3-2-5-5-5-1.2 0-2.2.4-3 1.4-.3.5-.5.6-1 .6h-.8c-.5 0-.7-.1-1-.6-.8-1-1.8-1.4-3-1.4z" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Circle cx="44" cy="34" r="10" stroke={color} strokeWidth={sw} />
          <Line x1="51" y1="41" x2="56" y2="46" stroke={color} strokeWidth={sw * 1.22} strokeLinecap={lc} />
        </Svg>
      );

    case "dental-chair":
      return (
        <Svg {...props}>
          <Path d="M14 32h22c2.5 0 4 1.5 4 3.5v1c0 2-1.5 3.5-4 3.5H14c-2.5 0-4-1.5-4-3.5v-1c0-2 1.5-3.5 4-3.5z" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M36 32c1-3 3-10 5.5-16 .8-2 2.5-2.8 4.2-2 1.7.8 2 2.5 1.2 4.5L41.5 32" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Line x1="25" y1="40" x2="25" y2="50" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Path d="M17 50h16" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Circle cx="48" cy="12" r="3.5" stroke={color} strokeWidth={sw * 0.83} fill={color} fillOpacity={0.05} />
          <Line x1="48" y1="15.5" x2="48" y2="20" stroke={color} strokeWidth={sw * 0.67} strokeLinecap={lc} />
        </Svg>
      );

    case "dentist":
      return (
        <Svg {...props}>
          <Circle cx="32" cy="18" r="9" stroke={color} strokeWidth={sw} />
          <Path d="M17 56v-8c0-8.5 6.5-15 15-15s15 6.5 15 15v8" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Ellipse cx="32" cy="9" rx="3.5" ry="3" stroke={color} strokeWidth={sw * 0.83} fill={color} fillOpacity={0.05} />
          <Line x1="32" y1="39" x2="32" y2="49" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
          <Line x1="27" y1="44" x2="37" y2="44" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
        </Svg>
      );

    case "tooth-clipboard":
      return (
        <Svg {...props}>
          <Rect x="14" y="12" width="36" height="44" rx="3" stroke={color} strokeWidth={sw} />
          <Path d="M25 12v-3c0-1.5 1.2-3 3-3h8c1.8 0 3 1.5 3 3v3" stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Rect x="24" y="10" width="16" height="4" rx="1" stroke={color} strokeWidth={sw * 0.67} />
          <Path d="M28 24c-1.5 0-2.5 1-2.5 2.5 0 1 .4 1.6.7 2.5.4 1 .8 2.2 1 3.5.15.8.5 1.2 1.3 1.2s1-.4 1.1-1.2c.15-.6.3-1.2.45-1.8.08-.3.2-.5.5-.5h1.9c.3 0 .42.2.5.5.15.6.3 1.2.45 1.8.1.8.4 1.2 1.1 1.2s1.15-.4 1.3-1.2c.2-1.3.6-2.5 1-3.5.3-.9.7-1.5.7-2.5 0-1.5-1-2.5-2.5-2.5-.6 0-1.2.2-1.5.7-.2.3-.4.4-.6.4h-1.4c-.2 0-.4-.1-.6-.4-.3-.5-.9-.7-1.5-.7z" stroke={color} strokeWidth={sw * 0.67} strokeLinecap={lc} />
          <Line x1="20" y1="40" x2="44" y2="40" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} opacity={0.2} />
          <Line x1="20" y1="44.5" x2="38" y2="44.5" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} opacity={0.2} />
          <Line x1="20" y1="49" x2="32" y2="49" stroke={color} strokeWidth={sw * 0.56} strokeLinecap={lc} opacity={0.2} />
        </Svg>
      );

    case "tooth-xray":
      return (
        <Svg {...props}>
          <Rect x="8" y="8" width="48" height="48" rx="5" stroke={color} strokeWidth={sw} />
          <Rect x="13" y="13" width="38" height="38" rx="3" stroke={color} strokeWidth={sw * 0.56} opacity={0.15} fill={color} fillOpacity={0.05} />
          <Path d="M27 21c-2.5 0-4.5 2-4.5 4.5 0 1.5.5 2.8 1.2 4.2.8 1.8 1.5 4 1.8 6.5.2 1.5.7 2 1.8 2s1.3-.6 1.6-2c.3-1 .5-2.2.7-3 .1-.5.3-.7.7-.7h2.4c.4 0 .6.2.7.7.2.8.4 2 .7 3 .3 1.4.7 2 1.6 2s1.6-.5 1.8-2c.3-2.5 1-4.7 1.8-6.5.7-1.4 1.2-2.7 1.2-4.2 0-2.5-2-4.5-4.5-4.5-1 0-2 .4-2.6 1.2-.3.5-.5.6-1 .6h-1.6c-.5 0-.7-.1-1-.6-.6-.8-1.6-1.2-2.6-1.2z" stroke={color} strokeWidth={sw * 0.83} strokeLinecap={lc} strokeLinejoin={lj} />
          <Path d="M29 38.5l-1.5 7" stroke={color} strokeWidth={sw * 0.72} strokeLinecap={lc} opacity={0.6} />
          <Path d="M35 38.5l1.5 7" stroke={color} strokeWidth={sw * 0.72} strokeLinecap={lc} opacity={0.6} />
        </Svg>
      );

    case "tooth-plus":
      return (
        <Svg {...props}>
          <Path d={TOOTH_SM} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
          <Circle cx="48" cy="16" r="9.5" stroke={color} strokeWidth={sw} fill={color} fillOpacity={0.05} />
          <Line x1="48" y1="11" x2="48" y2="21" stroke={color} strokeWidth={sw * 1.11} strokeLinecap={lc} />
          <Line x1="43" y1="16" x2="53" y2="16" stroke={color} strokeWidth={sw * 1.11} strokeLinecap={lc} />
        </Svg>
      );

    default:
      return (
        <Svg {...props}>
          <Path d={TOOTH} stroke={color} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} />
        </Svg>
      );
  }
}
