'use client';

import { Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteCandidateDataAction, rerunEvaluationAction } from '@/app/admin/actions';
import { Spinner } from '@/components/common/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';

export function ReportActions({
  assessmentId,
  canRerun,
  canPrint,
  canDelete,
}: {
  assessmentId: string;
  canRerun: boolean;
  canPrint: boolean;
  canDelete: boolean;
}) {
  const t = pl.report.actions;
  const [rerunning, startRerun] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="print-hidden flex flex-wrap gap-2">
      {canRerun && (
        <Button
          variant="outline"
          disabled={rerunning}
          onClick={() =>
            startRerun(async () => {
              const result = await rerunEvaluationAction(assessmentId);
              if (result.ok) toast.success(t.rerunDone);
              else toast.error(t.rerunFailed);
            })
          }
        >
          {rerunning ? <Spinner className="text-current" /> : <RefreshCw aria-hidden />}
          {rerunning ? t.rerunning : t.rerun}
        </Button>
      )}
      {canPrint && (
        <Button variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden />
          {t.print}
        </Button>
      )}
      {canDelete && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger">
              <Trash2 aria-hidden />
              {t.delete}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={(event) => {
                  // Keep the dialog open until the deletion finishes.
                  event.preventDefault();
                  startDelete(async () => {
                    const result = await deleteCandidateDataAction(assessmentId);
                    setConfirmOpen(false);
                    if (result.ok) toast.success(t.deleted);
                    else toast.error(t.deleteFailed);
                  });
                }}
              >
                {deleting ? <Spinner className="text-current" /> : <Trash2 aria-hidden />}
                {deleting ? t.deleting : t.deleteConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
