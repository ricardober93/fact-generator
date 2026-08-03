import type { VNode } from '@wabot-dev/framework/ui'

export const SIGN_OUT_ACTION = '/login/_action/signOut'

export function SignOutButton(): VNode {
  return (
    <form method="post" action={SIGN_OUT_ACTION}>
      <button class="btn btn-ghost btn-sm" data-action="sign-out">
        Salir
      </button>
    </form>
  )
}
