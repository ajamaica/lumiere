#!/bin/bash

# Intelligent calendar event parser and creator
# Takes user input and intelligently parses event details
# Prompts for missing information

echo "智能日历事件创建助手"
echo "====================="

# Get initial input
echo -n "请输入事件信息: "
read input

echo ""
echo "正在分析您的输入: $input"
echo ""

# Initialize variables
title=""
date=""
time=""
duration=60
location=""
description=""
reminder=""

# Simple parsing logic (would be enhanced with AI in real implementation)
# For now, we'll simulate parsing by asking targeted questions

# Check if we can detect common patterns
if [[ $input =~ ([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
    date="${BASH_REMATCH[1]}"
    echo "📅 检测到日期: $date"
else
    echo -n "📅 请输入事件日期 (YYYY-MM-DD): "
    read date
fi

if [[ $input =~ ([0-9]{1,2}:[0-9]{2}) ]]; then
    time="${BASH_REMATCH[1]}"
    echo "🕐 检测到时间: $time"
else
    echo -n "🕐 请输入事件时间 (HH:MM): "
    read time
fi

if [[ $input =~ (会议|meeting|会面|talk) ]]; then
    title="会议"
elif [[ $input =~ (电话|call|通话) ]]; then
    title="电话"
elif [[ $input =~ (约会|appointment|date) ]]; then
    title="约会"
else
    title="$input"
fi

# Clean up title if it's too long or contains date/time
if [[ ${#title} -gt 50 ]]; then
    # Extract title from input (excluding detected date/time)
    cleaned_input=${input/$date/}
    cleaned_input=${cleaned_input/$time/}
    title=$(echo $cleaned_input | cut -d' ' -f1-4)
fi

echo "🏷️  建议的事件标题: $title"
echo -n "是否使用此标题? (回车确认, 或输入新标题): "
read new_title
if [ -n "$new_title" ]; then
    title="$new_title"
fi

# Check for location in input
if [[ $input =~ (会议室|办公室|家里|公司|zoom|线上|在线) ]]; then
    location=$(echo $input | grep -oE "(会议室|办公室|家里|公司|zoom|线上|在线)[^ ,.]*")
    echo "📍 检测到地点: $location"
fi

if [ -z "$location" ]; then
    echo -n "📍 请输入事件地点 (可选): "
    read location
fi

# Check for duration in input
if [[ $input =~ ([0-9]+.{0,1}[小时|h|小时]) ]]; then
    dur_num=$(echo "${BASH_REMATCH[1]}" | grep -oE '[0-9]+')
    duration=$((dur_num * 60))
    echo "⏱️  检测到持续时间: ${dur_num}小时 (${duration}分钟)"
elif [[ $input =~ ([0-9]+.{0,1}[分钟|min]) ]]; then
    duration=$(echo "${BASH_REMATCH[1]}" | grep -oE '[0-9]+')
    echo "⏱️  检测到持续时间: ${duration}分钟"
fi

if [ $duration -eq 60 ]; then
    echo -n "⏱️  请输入持续时间 (分钟, 默认60): "
    read dur_input
    if [ -n "$dur_input" ]; then
        duration="$dur_input"
    fi
fi

# Check for reminder in input
if [[ $input =~ ([0-9]+.{0,1}[小时|天|分]) ]]; then
    reminder_text="${BASH_REMATCH[1]}"
    echo "🔔 检测到可能的提醒设置: $reminder_text"
    
    # Convert to minutes
    if [[ $reminder_text =~ [0-9]+ ]]; then
        num=$(echo "$reminder_text" | grep -oE '[0-9]+')
        if [[ $reminder_text =~ [天|d] ]]; then
            reminder=$((num * 1440))  # days to minutes
        elif [[ $reminder_text =~ [小时|h] ]]; then
            reminder=$((num * 60))    # hours to minutes
        else
            reminder=$num             # assume minutes
        fi
        echo "🔔 解析出的提醒时间: $reminder 分钟前"
    fi
fi

if [ -z "$reminder" ]; then
    echo ""
    echo "🔔 提醒设置"
    echo "============"
    echo "您希望提前多久收到提醒?"
    echo "1) 5分钟"
    echo "2) 15分钟" 
    echo "3) 30分钟"
    echo "4) 1小时 (60分钟)"
    echo "5) 3小时 (180分钟)"
    echo "6) 12小时 (720分钟)"
    echo "7) 1天 (1440分钟)"
    echo "8) 3天 (4320分钟)"
    echo "9) 自定义时间"
    echo ""

    echo -n "请选择 (1-9, 默认: 4): "
    read choice

    case $choice in
        1) reminder=5 ;;
        2) reminder=15 ;;
        3) reminder=30 ;;
        4) reminder=60 ;;
        5) reminder=180 ;;
        6) reminder=720 ;;
        7) reminder=1440 ;;
        8) reminder=4320 ;;
        9) 
            echo -n "请输入提前多少分钟提醒: "
            read reminder
            ;;
        *)
            reminder=60
            ;;
    esac
fi

# Use original input as description if not detected otherwise
description="$input"

echo ""
echo "📋 摘要:"
echo "标题: $title"
echo "日期: $date"
echo "时间: $time"
echo "持续: $duration 分钟"
echo "地点: $location"
echo "提醒: $reminder 分钟前"
echo "描述: $description"
echo ""

echo -n "是否创建此事件? (y/N): "
read confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    cmd="/home/ubuntu/.openclaw/workspace/skills/calendar/scripts/calendar.sh create --title \"$title\" --date $date --time $time --duration $duration --reminder $reminder"
    
    if [ -n "$location" ]; then
        cmd="$cmd --location \"$location\""
    fi
    
    cmd="$cmd --description \"$description\""
    
    echo "正在创建事件..."
    eval $cmd
    echo ""
    echo "✅ 事件创建成功！"
else
    echo "已取消创建事件。"
fi