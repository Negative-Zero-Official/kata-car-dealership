import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App'

test('renders the home page', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Car Dealership' })).toBeInTheDocument()
})
