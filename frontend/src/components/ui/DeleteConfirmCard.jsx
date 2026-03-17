import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';

export function DeleteConfirmCard({
  open,
  title = 'Confirm delete',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/70">
      <CardHeader>
        <CardTitle className="text-base text-red-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-red-700">{description}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
