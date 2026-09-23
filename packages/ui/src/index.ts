/**
 * Shared design primitives — build spec §22 (modern, minimal, calm). Real
 * components land starting Phase 4: react-dom form primitives driving the
 * generic, data-driven ItemForm (see ./fieldConfig.ts's header comment for
 * why apps/mobile's eventual React Native UI reuses fieldConfig/validation
 * but not these components directly).
 */

export const KRYVEX_BRAND_COLOR = "#1f2937" as const;

export { cn } from "./lib/utils";

export { Button, buttonVariants } from "./components/ui/button";
export type { ButtonProps } from "./components/ui/button";

export { Input } from "./components/ui/input";

export { Label } from "./components/ui/label";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";

export { Progress } from "./components/ui/progress";

export { Textarea } from "./components/ui/textarea";

export { Badge, badgeVariants } from "./components/ui/badge";
export type { BadgeProps } from "./components/ui/badge";

export { Select } from "./components/ui/select";

export { Alert } from "./components/ui/alert";
export type { AlertProps } from "./components/ui/alert";

export { Skeleton } from "./components/ui/skeleton";

export { EmptyState } from "./components/ui/empty-state";
export type { EmptyStateProps } from "./components/ui/empty-state";

export { SearchInput } from "./components/ui/search-input";

export { Dialog } from "./components/ui/dialog";
export type { DialogProps } from "./components/ui/dialog";

export { Sheet } from "./components/ui/sheet";
export type { SheetProps } from "./components/ui/sheet";

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

export { GovernmentIdUploadForm } from "./components/GovernmentIdUploadForm";
export type {
  GovernmentIdUploadFormProps,
  GovernmentIdUploadFormValues,
} from "./components/GovernmentIdUploadForm";

export { EmergencyKit } from "./components/EmergencyKit";
export type { EmergencyKitProps } from "./components/EmergencyKit";

export { CopyableTextField } from "./components/CopyableTextField";
export type { CopyableTextFieldProps } from "./components/CopyableTextField";

export { CustomFieldsEditor } from "./components/CustomFieldsEditor";
export type { CustomFieldsEditorProps } from "./components/CustomFieldsEditor";

export { DateField } from "./components/DateField";
export type { DateFieldProps } from "./components/DateField";

export { ItemForm } from "./components/ItemForm";
export type { ItemFormProps } from "./components/ItemForm";

export { ItemTypeBadge, getItemTypeIcon } from "./components/ItemTypeBadge";

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
