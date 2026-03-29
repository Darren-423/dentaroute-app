import React from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";

type AccessibleButtonProps = Omit<TouchableOpacityProps, "accessibilityLabel"> & {
  accessibilityLabel: string;
};

export default function AccessibleButton({
  children,
  accessibilityLabel,
  ...rest
}: AccessibleButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}
