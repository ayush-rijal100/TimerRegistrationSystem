package com.sireto.timer_registration_api.controller;

import java.time.LocalDate;
import java.util.List;
import com.sireto.timer_registration_api.dto.TimeEntryRequest;
import com.sireto.timer_registration_api.dto.TimeEntryResponse;
import com.sireto.timer_registration_api.service.TimeEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/time-entries")
public class TimeEntryController {

    private final TimeEntryService timeEntryService;

    @PostMapping
    public TimeEntryResponse createTimeEntry(@Valid @RequestBody TimeEntryRequest request) {
        return timeEntryService.createTimeEntry(request);
    }

@GetMapping("/my")
public List<TimeEntryResponse> getMyTimeEntries(
        @RequestParam LocalDate startDate,
        @RequestParam LocalDate endDate
) {
    return timeEntryService.getMyTimeEntries(startDate, endDate);
}
@PutMapping("/{id}")
public TimeEntryResponse updateTimeEntry(
        @PathVariable Long id,
        @Valid @RequestBody TimeEntryRequest request
) {
    return timeEntryService.updateTimeEntry(id, request);
}


}