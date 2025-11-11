package com.example

class GoodExample {
    companion object {
        private const val MULTIPLIER = 100
    }
    
    fun calculate(): Int {
        val base = 42
        return base * MULTIPLIER
    }
}
