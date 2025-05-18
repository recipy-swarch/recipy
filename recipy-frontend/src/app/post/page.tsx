import React from 'react'
import Link from 'next/link'

export default function Post() {
  return (
    <div>
        <form action="prevent">
            <Link href="/recipes">
                <label htmlFor="title">Title</label>
                <input type="text" id="title" name="title" />
            </Link>
            <div>
                <label htmlFor="content">Content</label>
                <textarea id="content" name="content"></textarea>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>
  )
}
