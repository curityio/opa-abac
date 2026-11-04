package authz

default allow = false

clearance_rank := {"public": 0, "internal": 1, "confidential": 2, "top-secret": 3}

allow if {
    endpoint := data.endpoints[input.path]
    clearance_rank[input.claims.clearance] >= clearance_rank[endpoint.required_clearance]
    hours_ok(endpoint)
}

hours_ok(endpoint) if {
    not endpoint.restricted_hours
}

hours_ok(endpoint) if {
    h := time.clock(time.now_ns())[0]
    h >= endpoint.restricted_hours[0]
    h < endpoint.restricted_hours[1]
}
