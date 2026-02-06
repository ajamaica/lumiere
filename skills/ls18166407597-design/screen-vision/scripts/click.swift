import Foundation
import CoreGraphics

func click(x: Int, y: Int) {
    let source = CGEventSource(stateID: .hidSystemState)
    let location = CGPoint(x: x, y: y)
    
    let mouseDown = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: location, mouseButton: .left)
    let mouseUp = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: location, mouseButton: .left)
    
    mouseDown?.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.1)
    mouseUp?.post(tap: .cghidEventTap)
}

if CommandLine.arguments.count == 3,
   let x = Int(CommandLine.arguments[1]),
   let y = Int(CommandLine.arguments[2]) {
    click(x: x, y: y)
    print("Clicked at [\(x), \(y)]")
} else {
    print("Usage: swift click.swift <x> <y>")
}
