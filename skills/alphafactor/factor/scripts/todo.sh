#!/bin/bash
# todo.sh - Manage macOS Reminders via AppleScript
# Usage: ./todo.sh <action> [args...]

ACTION="$1"
shift

case "$ACTION" in
  add)
    # Add reminder: ./todo.sh add "title" "notes" "date" "list" "priority" "recur"
    TITLE="$1"
    NOTES="$2"
    DUEDATE="$3"
    LIST="$4"
    PRIORITY="$5"
    RECUR="$6"
    
    osascript -e "
      tell application \"Reminders\"
        set remTitle to \"$TITLE\"
        set remNotes to \"$NOTES\"
        set remList to \"$LIST\"
        set remPriority to $PRIORITY
        
        -- Determine target list
        if remList is not \"\" and remList is not \"default\" then
          try
            set targetList to first list whose name is remList
          on error
            set targetList to default list
          end try
        else
          set targetList to default list
        end if
        
        -- Create reminder
        set newReminder to make new reminder at targetList with properties {name:remTitle, body:remNotes}
        
        -- Set priority (1=high, 5=medium, 9=low)
        if remPriority > 0 then
          set priority of newReminder to remPriority
        end if
        
        -- Set due date
        set dateStr to \"$DUEDATE\"
        if dateStr is not \"\" then
          try
            set dueDate to date dateStr
            set due date of newReminder to dueDate
          end try
        end if
        
        -- Set recurrence
        set recurStr to \"$RECUR\"
        if recurStr is not \"\" then
          -- Recurring settings require more complex handling; marking for now
          -- macOS Reminders recurrence is complex; recommend manual setup
        end if
        
        return \"Created reminder: \" & remTitle
      end tell
    "
    ;;
    
  list)
    # List reminders: ./todo.sh list [list_name] [show_completed]
    LISTNAME="$1"
    SHOWCOMPLETED="$2"
    
    osascript -e "
      tell application \"Reminders\"
        set output to \"\"
        set listFilter to \"$LISTNAME\"
        set showCompleted to \"$SHOWCOMPLETED\"
        
        if listFilter is not \"\" then
          try
            set targetList to first list whose name is listFilter
            set allReminders to reminders of targetList
          on error
            return \"Error: List '\" & listFilter & \"' not found\"
          end try
        else
          set allReminders to reminders of default list
        end if
        
        repeat with rem in allReminders
          set remCompleted to completed of rem
          
          -- Filter based on showCompleted
          if showCompleted is \"true\" or not remCompleted then
            set remName to name of rem
            set remPriority to priority of rem
            set remDue to due date of rem
            
            -- Status icon
            if remCompleted then
              set statusIcon to \"[✓]\"
            else
              set statusIcon to \"[ ]\"
            end if
            
            -- Priority icon
            if remPriority is 1 then
              set pIcon to \"🔴 \"
            else if remPriority is 5 then
              set pIcon to \"🟡 \"
            else if remPriority is 9 then
              set pIcon to \"🔵 \"
            else
              set pIcon to \"\"
            end if
            
            -- Due date
            if remDue is not missing value then
              set dateStr to short date string of remDue & \" \" & time string of remDue
            else
              set dateStr to \"No due date\"
            end if
            
            set output to output & statusIcon & \" \" & pIcon & remName & \" (\" & dateStr & \")\" & linefeed
          end if
        end repeat
        
        if output is \"\" then
          return \"No reminders found\"
        else
          return output
        end if
      end tell
    "
    ;;
    
  complete)
    # Mark complete: ./todo.sh complete "reminder_title"
    TITLE="$1"
    
    osascript -e "
      tell application \"Reminders\"
        set searchTitle to \"$TITLE\"
        set found to false
        
        repeat with rem in reminders of default list
          if name of rem contains searchTitle then
            set completed of rem to true
            set completion date of rem to current date
            set found to true
            return \"Completed: \" & name of rem
          end if
        end repeat
        
        -- Search all lists if not found
        if not found then
          repeat with aList in lists
            repeat with rem in reminders of aList
              if name of rem contains searchTitle then
                set completed of rem to true
                set completion date of rem to current date
                return \"Completed: \" & name of rem & \" (in '\" & name of aList & \"')\"
              end if
            end repeat
          end repeat
        end if
        
        return \"Reminder not found: \" & searchTitle
      end tell
    "
    ;;
    
  uncomplete)
    # Unmark complete: ./todo.sh uncomplete "reminder_title"
    TITLE="$1"
    
    osascript -e "
      tell application \"Reminders\"
        set searchTitle to \"$TITLE\"
        
        repeat with aList in lists
          repeat with rem in reminders of aList
            if name of rem contains searchTitle then
              set completed of rem to false
              set completion date of rem to missing value
              return \"Uncompleted: \" & name of rem
            end if
          end repeat
        end repeat
        
        return \"Reminder not found: \" & searchTitle
      end tell
    "
    ;;
    
  delete)
    # Delete reminder: ./todo.sh delete "reminder_title"
    TITLE="$1"
    
    osascript -e "
      tell application \"Reminders\"
        set searchTitle to \"$TITLE\"
        
        repeat with aList in lists
          repeat with rem in reminders of aList
            if name of rem contains searchTitle then
              set remName to name of rem
              delete rem
              return \"Deleted: \" & remName
            end if
          end repeat
        end repeat
        
        return \"Reminder not found: \" & searchTitle
      end tell
    "
    ;;
    
  search)
    # Search reminders: ./todo.sh search "keyword"
    KEYWORD="$1"
    
    osascript -e "
      tell application \"Reminders\"
        set searchKeyword to \"$KEYWORD\"
        set output to \"\"
        
        repeat with aList in lists
          set listName to name of aList
          repeat with rem in reminders of aList
            set remName to name of rem
            set remBody to body of rem
            
            if remName contains searchKeyword or (remBody is not missing value and remBody contains searchKeyword) then
              set remCompleted to completed of rem
              if remCompleted then
                set statusIcon to \"[✓]\"
              else
                set statusIcon to \"[ ]\"
              end if
              
              set output to output & \"[\" & listName & \"] \" & statusIcon & \" \" & remName & linefeed
            end if
          end repeat
        end repeat
        
        if output is \"\" then
          return \"No reminders found containing '\" & searchKeyword & \"'\"
        else
          return output
        end if
      end tell
    "
    ;;
    
  lists)
    # Get all lists: ./todo.sh lists
    osascript -e "
      tell application \"Reminders\"
        set output to \"\"
        repeat with aList in lists
          set listName to name of aList
          set remCount to count of reminders of aList
          set compCount to 0
          
          repeat with rem in reminders of aList
            if completed of rem then
              set compCount to compCount + 1
            end if
          end repeat
          
          set output to output & listName & \" (\" & remCount & \" items, \" & compCount & \" completed)\" & linefeed
        end repeat
        
        return output
      end tell
    "
    ;;
    
  create-list)
    # Create list: ./todo.sh create-list "list_name"
    LISTNAME="$1"
    
    osascript -e "
      tell application \"Reminders\"
        set newListName to \"$LISTNAME\"
        
        -- Check if exists
        repeat with aList in lists
          if name of aList is newListName then
            return \"List '\" & newListName & \"' already exists\"
          end if
        end repeat
        
        make new list with properties {name:newListName}
        return \"Created list: \" & newListName
      end tell
    "
    ;;
    
  today)
    # Get today's due reminders: ./todo.sh today
    osascript -e "
      tell application \"Reminders\"
        set output to \"\"
        set todayStart to (current date)
        set time of todayStart to 0
        set todayEnd to todayStart + (1 * days) - 1
        
        repeat with aList in lists
          repeat with rem in reminders of aList
            set remDue to due date of rem
            if remDue is not missing value then
              if remDue ≥ todayStart and remDue ≤ todayEnd and not (completed of rem) then
                set remName to name of rem
                set remPriority to priority of rem
                
                if remPriority is 1 then
                  set pIcon to \"🔴 \"
                else if remPriority is 5 then
                  set pIcon to \"🟡 \"
                else if remPriority is 9 then
                  set pIcon to \"🔵 \"
                else
                  set pIcon to \"\"
                end if
                
                set output to output & \"[\" & name of aList & \"] \" & pIcon & remName & \" (\" & time string of remDue & \")\" & linefeed
              end if
            end if
          end repeat
        end repeat
        
        if output is \"\" then
          return \"No reminders due today\"
        else
          return output
        end if
      end tell
    "
    ;;
    
  *)
    echo "Usage: ./todo.sh <action> [args...]"
    echo ""
    echo "Actions:"
    echo "  add \"title\" \"notes\" \"date\" \"list\" \"priority\" \"recur\"  - Add reminder"
    echo "  list [list_name] [true/false]                     - List reminders"
    echo "  complete \"title\"                               - Mark complete"
    echo "  uncomplete \"title\"                             - Unmark complete"
    echo "  delete \"title\"                                 - Delete reminder"
    echo "  search \"keyword\"                               - Search reminders"
    echo "  lists                                            - Show all lists"
    echo "  create-list \"list_name\"                        - Create new list"
    echo "  today                                            - Today's due reminders"
    echo ""
    echo "Examples:"
    echo "  ./todo.sh add \"Buy milk\" \"Go to store\" \"2025-02-05\" \"Shopping\" 0 \"\""
    echo "  ./todo.sh list \"Shopping\" false"
    echo "  ./todo.sh complete \"Buy milk\""
    ;;
esac
