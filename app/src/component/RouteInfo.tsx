const RouteInfo = ({ route }) => 
    <p>
        {route ? route.route_short_name : "Bus"}
    </p>

export {RouteInfo}