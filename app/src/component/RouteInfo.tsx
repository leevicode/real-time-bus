const RouteInfo = ({ route }: { route?: { route_short_name?: string } }) => 
    <p>
        {route?.route_short_name ?? "Bus"}
    </p>

export {RouteInfo}