import React from 'react'

function Header() {
  return (
    <header className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-[300px] flex justify-center items-center'>
        <div className='text-center'>
          <h1 className='text-white text-5xl'>PolicyTracker</h1>
          <p className='text-white text-2xl'>WebApp for tracking thai policy</p>
          <form action="" className='flex mt-2'>
              <input 
                  type="text" 
                  className='w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 shadow-md'
                  placeholder='Policy Name...'
              />
              <button className='inline-flex items-center mx-2 px-4 py-2 rounded-md bg-green-500 text-white shadow-md' type='submit'>Search</button>
          </form>
        </div>
    </header>
  )
}

export default Header
