import React from "react";
import { TextInput, TextInputProps } from "react-native";

type AccessibleInputProps = Omit<TextInputProps, "accessibilityLabel"> & {
  accessibilityLabel: string;
  errorHint?: string;
};

export default function AccessibleInput({
  accessibilityLabel,
  errorHint,
  ...rest
}: AccessibleInputProps) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      {...(errorHint ? { accessibilityHint: errorHint } : {})}
      {...rest}
    />
  );
}
