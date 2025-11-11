package com.example

class BadExample {
    fun calculate() {
        val result = 42 * 100  // Magic numbers
        println("Very long line that exceeds the maximum line length configured in detekt rules and should trigger a violation")
    }
    
    private fun helperFunction() {
        val x = 1
        val y = 2
        val z = 3
        val a = 4
        val b = 5
        val c = 6
        val d = 7
        val e = 8
        // Too many variables in one function
    }
}
