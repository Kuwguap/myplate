import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastContainer } from '@/components/ui/toast-context'

// Custom render function that includes providers
const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, {
    wrapper: ({ children }) => (
      <ToastContainer>
        {children}
      </ToastContainer>
    ),
    ...options,
  })

export * from '@testing-library/react'
export { customRender as render }
export { userEvent } 