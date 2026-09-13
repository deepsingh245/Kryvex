/**
 * Shared design primitives — build spec §22 (modern, minimal, calm). Real
 * components land starting Phase 4: react-dom form primitives driving the
 * generic, data-driven ItemForm (see ./fieldConfig.ts's header comment for
 * why apps/mobile's eventual React Native UI reuses fieldConfig/validation
 * but not these components directly).
 */

export const KRYVEX_BRAND_COLOR = "#1f2937" as const;

export {
  ITEM_TYPE_ENABLED,
  ITEM_TYPE_FIELD_CONFIG,
  ITEM_TYPE_ICON_NAMES,
  ITEM_TYPE_LABELS,
} from "./fieldConfig";
export type { ItemFieldConfig, ItemFieldKind } from "./fieldConfig";

export { AttachmentPreview } from "./components/AttachmentPreview";
export type { AttachmentPreviewProps } from "./components/AttachmentPreview";

export { AttachmentUploadForm } from "./components/AttachmentUploadForm";
export type {
  AttachmentUploadFormProps,
  AttachmentUploadFormValues,
} from "./components/AttachmentUploadForm";

export { BooleanField } from "./components/BooleanField";
export type { BooleanFieldProps } from "./components/BooleanField";

export { EmergencyKit } from "./components/EmergencyKit";
export type { EmergencyKitProps } from "./components/EmergencyKit";

export { Button } from "./components/Button";
export type { ButtonProps } from "./components/Button";

export { CustomFieldsEditor } from "./components/CustomFieldsEditor";
export type { CustomFieldsEditorProps } from "./components/CustomFieldsEditor";

export { DateField } from "./components/DateField";
export type { DateFieldProps } from "./components/DateField";

export { ItemForm } from "./components/ItemForm";
export type { ItemFormProps } from "./components/ItemForm";

export { ItemTypeBadge } from "./components/ItemTypeBadge";

export { MultilineField } from "./components/MultilineField";
export type { MultilineFieldProps } from "./components/MultilineField";

export { PasswordGeneratorPanel } from "./components/PasswordGeneratorPanel";
export type { PasswordGeneratorPanelProps } from "./components/PasswordGeneratorPanel";

export { SecretField } from "./components/SecretField";
export type { SecretFieldProps } from "./components/SecretField";

export { TagsInput } from "./components/TagsInput";
export type { TagsInputProps } from "./components/TagsInput";

export { TextField } from "./components/TextField";
export type { TextFieldProps } from "./components/TextField";
