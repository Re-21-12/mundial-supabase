export interface StateProps {
  required: boolean;
  disabled: boolean;
  hidden: boolean;
  readonly: boolean;
  repeatible: RepeatProps;
}
export interface RepeatProps {
  repeat: boolean;
  minItems: number;
  maxItems: number;
}
