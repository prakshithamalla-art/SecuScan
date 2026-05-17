import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '../Settings'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} },
    removeItem: (key: string) => { delete store[key] }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.confirm
const mockConfirm = vi.fn()
window.confirm = mockConfirm

// Mock toast context
vi.mock('../../components/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn()
  })
}))

// Mock theme context
vi.mock('../../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn()
  })
}))

describe('Settings Page - Save and Reset Behavior', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockConfirm.mockReset()
    mockConfirm.mockReturnValue(true) // Default: user confirms
  })

  describe('Save Behavior', () => {
    it('should update localStorage when save button is clicked', async () => {
      render(<Settings />)
      
      // Find and click save button
      const saveButton = screen.getByText(/COMMIT_ENGINE_CHANGES/i)
      fireEvent.click(saveButton)
      
      // Check if localStorage was updated
      await waitFor(() => {
        const savedConfig = localStorageMock.getItem('secuscan-config')
        expect(savedConfig).not.toBeNull()
        expect(savedConfig).toContain('concurrentScans')
      })
    })

    it('should save modified config values to localStorage', async () => {
      render(<Settings />)
      
      // Find a setting and change it (example: concurrent scans)
      const concurrentScansInput = screen.getByLabelText(/Concurrent_Operations/i)
      if (concurrentScansInput) {
        fireEvent.change(concurrentScansInput, { target: { value: '16' } })
      }
      
      // Save
      const saveButton = screen.getByText(/COMMIT_ENGINE_CHANGES/i)
      fireEvent.click(saveButton)
      
      // Verify localStorage contains the new value
      await waitFor(() => {
        const savedConfig = JSON.parse(localStorageMock.getItem('secuscan-config') || '{}')
        expect(savedConfig.concurrentScans).toBe(16)
      })
    })
  })

  describe('Reset Behavior', () => {
    it('should show confirmation dialog when reset button is clicked', async () => {
      render(<Settings />)
      
      const resetButton = screen.getByText(/ENGINE_RESET/i)
      fireEvent.click(resetButton)
      
      expect(mockConfirm).toHaveBeenCalled()
    })

    it('should restore default config after confirmation', async () => {
      // First, modify some settings
      render(<Settings />)
      
      // Change a value
      const concurrentScansInput = screen.getByLabelText(/Concurrent_Operations/i)
      if (concurrentScansInput) {
        fireEvent.change(concurrentScansInput, { target: { value: '99' } })
      }
      
      // Save the modified config
      const saveButton = screen.getByText(/COMMIT_ENGINE_CHANGES/i)
      fireEvent.click(saveButton)
      
      // Verify it was saved
      await waitFor(() => {
        const savedConfig = JSON.parse(localStorageMock.getItem('secuscan-config') || '{}')
        expect(savedConfig.concurrentScans).toBe(99)
      })
      
      // Now click reset (confirm is true by default)
      const resetButton = screen.getByText(/ENGINE_RESET/i)
      fireEvent.click(resetButton)
      
      // Check if localStorage was reset to defaults
      await waitFor(() => {
        const resetConfig = JSON.parse(localStorageMock.getItem('secuscan-config') || '{}')
        expect(resetConfig.concurrentScans).toBe(8) // Default value from DEFAULT_CONFIG
      })
    })

    it('should NOT reset config if user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false) // User cancels
      
      // First, set some custom config
      render(<Settings />)
      
      // Change a value
      const concurrentScansInput = screen.getByLabelText(/Concurrent_Operations/i)
      if (concurrentScansInput) {
        fireEvent.change(concurrentScansInput, { target: { value: '50' } })
      }
      
      // Save
      const saveButton = screen.getByText(/COMMIT_ENGINE_CHANGES/i)
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        const savedConfig = JSON.parse(localStorageMock.getItem('secuscan-config') || '{}')
        expect(savedConfig.concurrentScans).toBe(50)
      })
      
      // Click reset (confirm returns false)
      const resetButton = screen.getByText(/ENGINE_RESET/i)
      fireEvent.click(resetButton)
      
      // Verify config was NOT reset
      await waitFor(() => {
        const configAfterCancel = JSON.parse(localStorageMock.getItem('secuscan-config') || '{}')
        expect(configAfterCancel.concurrentScans).toBe(50) // Still 50, not reset to 8
      })
    })
  })
})