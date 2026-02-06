# Troubleshooting Guide for Menstrual Tracking Skill

This document records common issues encountered during development and deployment of the menstrual tracking skill, along with solutions to prevent other OpenClaw agents from making the same mistakes.

## Common Issues and Solutions

### 1. Character Encoding Issues

**Problem**: Chinese characters displayed as squares in generated charts
**Solution**:

- Always specify font settings to handle international characters
- Use fallback fonts when specific fonts are unavailable
- Convert all text to English when displaying in charts to avoid character rendering issues

**Example Fix**:

```python
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans', 'Liberation Sans']
plt.rcParams['axes.unicode_minus'] = False
```

### 2. Indentation Errors

**Problem**: Python indentation errors causing script failures
**Solution**:

- Maintain consistent indentation throughout the code (typically 4 spaces)
- Use proper code editors that show indentation issues
- Always test code before finalizing

**Example Issue**:

```python
# Incorrect indentation
    for j, day in enumerate(weekdays):
    for i in range(5):  # Wrong indentation
        print(i)
```

### 3. Data Mapping Problems

**Problem**: Inconsistent mapping between categorical data (like bleeding levels) and numerical values
**Solution**:

- Define clear mapping dictionaries at the beginning of the code
- Use consistent keys across all functions
- Validate data types before processing

### 4. Chart Layout Issues

**Problem**: Legend or labels overlapping chart content
**Solution**:

- Calculate proper spacing before placing elements
- Add padding around chart boundaries
- Test chart rendering with various data sizes

### 5. Data Filtering Issues

**Problem**: Including wrong year's data when creating year-specific charts
**Solution**:

- Implement proper date filtering logic
- Validate that filtered data contains expected records
- Always verify the data subset before generating visualizations

### 6. Variable Scope Issues

**Problem**: Using undefined variables in conditional statements
**Solution**:

- Initialize variables before conditional blocks
- Use defensive programming practices
- Verify variable existence before usage

### 7. Dependency Management

**Problem**: Missing required libraries for visualization
**Solution**:

- Include clear dependency installation instructions
- Check for required packages before attempting operations
- Provide fallback options when possible

## Best Practices Learned

1. **Always test with real data**: Synthetic test data may not reveal all issues
2. **Validate inputs**: Check data types and ranges before processing
3. **Handle missing values**: Account for None/null values in data
4. **Provide clear error messages**: Help users understand what went wrong
5. **Modularize code**: Break functionality into smaller, testable functions
6. **Document assumptions**: Note any assumptions about data format or structure
7. **Test edge cases**: Consider scenarios with minimal or maximum data points

## Common Debugging Steps

1. **Check data integrity**: Verify that input data matches expected format
2. **Validate variable assignments**: Ensure all variables used are properly defined
3. **Test individual functions**: Validate each function independently
4. **Verify file paths**: Confirm all file paths exist and are writable
5. **Monitor library versions**: Some issues may arise from version incompatibilities

By following this troubleshooting guide, other OpenClaw agents can avoid common pitfalls when implementing similar functionality.
