import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastContainer } from '@/components/ui/toast-context'
import { ReactElement } from 'react'

// Custom render function that includes providers
const customRender = (ui: ReactElement, options = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastContainer>{children}</ToastContainer>
  )

  return render(ui, {
    wrapper: Wrapper,
    ...options,
  })
}

export * from '@testing-library/react'
export { customRender as render }
export { userEvent } 