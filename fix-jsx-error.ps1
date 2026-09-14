# Fix JSX Error in NextItemSuggestion.js
# Problem: Missing closing </div> tag

$filePath = "frontend/src/components/NextItemSuggestion.js"

Write-Host "Analyzing $filePath..." -ForegroundColor Cyan

# Count opening and closing divs
$content = Get-Content $filePath -Raw
$openDivs = ([regex]::Matches($content, '<div')).Count
$closeDivs = ([regex]::Matches($content, '</div>')).Count

Write-Host "Opening <div> tags: $openDivs" -ForegroundColor Yellow
Write-Host "Closing </div> tags: $closeDivs" -ForegroundColor Yellow

if ($openDivs -gt $closeDivs) {
    Write-Host "`nMissing $($openDivs - $closeDivs) closing </div> tag(s)!" -ForegroundColor Red
    
    # Read the file line by line to find where the mismatch occurs
    $lines = Get-Content $filePath
    $divStack = 0
    $maxStack = 0
    $maxLine = 0
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $openCount = ([regex]::Matches($line, '<div')).Count
        $closeCount = ([regex]::Matches($line, '</div>')).Count
        
        $divStack += $openCount - $closeCount
        
        if ($divStack -gt $maxStack) {
            $maxStack = $divStack
            $maxLine = $i + 1
        }
    }
    
    Write-Host "`nDeepest nesting at line $maxLine (depth: $maxStack)" -ForegroundColor Cyan
    Write-Host "Final div stack: $divStack (should be 0)" -ForegroundColor Yellow
    
    # Show lines around the problem area
    Write-Host "`nShowing lines 925-935:" -ForegroundColor Cyan
    for ($i = 924; $i -lt 935 -and $i -lt $lines.Count; $i++) {
        Write-Host "$($i + 1): $($lines[$i])"
    }
}

Write-Host "`nTo fix manually, add a closing </div> tag before line 930" -ForegroundColor Green
