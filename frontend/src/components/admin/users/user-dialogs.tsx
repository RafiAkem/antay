import { ConfirmModal } from '../shared/confirm-modal'
import { PasswordModal } from './password-modal'
import { UserCreateModal } from './user-create-modal'
import { ROLE_LABEL } from './user-labels'
import type { useUsersPage } from './use-users-page'

type Page = ReturnType<typeof useUsersPage>

export function UserDialogs({ page }: { page: Page }) {
  const target = page.toggling

  return (
    <>
      {page.creating !== null ? (
        <UserCreateModal
          key={page.creating}
          organizers={page.organizers}
          organizersLoading={page.organizersLoading}
          organizersError={page.organizersError}
          onRetryOrganizers={page.retryOrganizers}
          onCreated={page.handleCreated}
          onOrganizersStale={page.reloadOrganizers}
          onClose={page.closeCreate}
        />
      ) : null}

      {page.resetting ? (
        <PasswordModal
          key={page.resetting.key}
          user={page.resetting.user}
          onDone={page.handlePasswordDone}
          onClose={page.closeReset}
        />
      ) : null}

      <ConfirmModal
        open={target !== null}
        title={target?.isActive ? `Nonaktifkan akun ${target.name}?` : `Aktifkan akun ${target?.name ?? ''}?`}
        description={
          target?.isActive
            ? `${target.email} tidak bisa masuk lagi sampai diaktifkan kembali. Data yang sudah dibuat akun ini tetap tersimpan.`
            : `${target?.email ?? ''} bisa masuk lagi sebagai ${target ? ROLE_LABEL[target.role].toLowerCase() : ''} dengan kata sandi terakhirnya.`
        }
        confirmLabel={target?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        tone={target?.isActive ? 'danger' : 'primary'}
        busy={page.toggleBusy}
        onConfirm={page.confirmToggle}
        onClose={page.cancelToggle}
      />
    </>
  )
}
