"use client"

import type { Dispatch, SetStateAction } from "react"
import { X, Plus } from "lucide-react"
import styles from "./dynamic-list.module.css"

interface DynamicListProps {
  items: string[]
  setItems: Dispatch<SetStateAction<string[]>>
  placeholder?: string
  buttonText?: string
  isTextarea?: boolean
}

export default function DynamicList({
  items,
  setItems,
  placeholder = "Agregar item",
  buttonText = "Agregar item",
  isTextarea = false,
}: DynamicListProps) {
  const handleChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    setItems(newItems)
  }

  const handleAdd = () => {
    setItems([...items, ""])
  }

  const handleRemove = (index: number) => {
    if (items.length === 1) {
      setItems([""])
    } else {
      const newItems = [...items]
      newItems.splice(index, 1)
      setItems(newItems)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.itemsList}>
        {items.map((item, index) => (
          <div key={index} className={styles.itemRow}>
            <div className={styles.itemNumber}>{index + 1}.</div>
            {isTextarea ? (
              <textarea
                value={item}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={placeholder}
                className={styles.textarea}
                rows={2}
              />
            ) : (
              <input
                type="text"
                value={item}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={placeholder}
                className={styles.input}
              />
            )}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className={styles.removeButton}
              aria-label="Eliminar item"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={handleAdd} className={styles.addButton}>
        <Plus size={18} />
        {buttonText}
      </button>
    </div>
  )
}
