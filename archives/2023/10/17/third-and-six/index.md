---
title: "What Was That?"
author: "Derek Willis"
date: "2023-10-17"
categories: [maryland football, wtf]
---

```r
suppressMessages(library(tidyverse))
suppressMessages(library(cfbfastR))

pbp <- load_cfb_pbp(seasons = c(2019, 2020, 2021, 2022, 2023))

big_ten <- c('Maryland', 'Wisconsin', 'Ohio State', 'Michigan', 'Michigan State', 'Penn State', 'Rutgers', 'Northwestern', 'Iowa', 'Minnesota', 'Nebraska', 'Indiana', 'Illinois', 'Purdue')
```

If you were at Secu stadium on Oct. 14 for the Maryland-Illinois game and saw the Terrapins run the ball on third and six from the Illinois 29-yard line late in the game, you might have had the question I did: "Why didn't Maryland pass?"

It turns out that running the ball in that situation isn't the strangest thing for Maryland under Mike Locksley. It may not have been a successful call, but it wasn't totally unexpected, either. While the Terps aren't a one-dimensional offensive team, since the start of the 2019 season they have run the ball on third and six more than all but two Big Ten teams (Nebraska and Northwestern).

```r
third_and_six <- pbp |> filter(down == 3, distance == 6)
third_and_six_runs <- third_and_six |> filter(str_detect(play_type, "Rush"))

runs_by_team <- third_and_six_runs |> group_by(pos_team)  |> summarise(total = n()) |> arrange(desc(total))

runs_by_team_big_ten <- third_and_six_runs |> filter(pos_team %in% big_ten) |> group_by(pos_team)  |> summarise(total = n()) |> arrange(desc(total))
```

The most common call in that specific game situation is to pass the ball, according to an analysis of play-by-play data from college football games for the past five seasons. Slightly more than one in five times, the offensive team runs the ball, but that doesn't apply equally to every team. Programs that emphasize the ground game such as the military academies run much more often in that situation than most other teams. Crucially, running doesn't seem crazy when you consider the outcomes: when choosing to run on third-and-six, nearly 40% of the time a team gains at least six yards, including plays that result in a touchdown.

```r
nrow(third_and_six_runs)/nrow(third_and_six)
```

```text
[1] 0.2103855
```

```r
third_and_six_rush_success <- third_and_six_runs |> filter(yards_gained >= 6) |> nrow()

third_and_six_rush_success/third_and_six_runs |> nrow()
```

```text
[1] 0.3934817
```

But has that strategy worked for Maryland? Under Locksley, the Terps have passed the ball on two of every three plays when facing third-and-six, which means they run more often than the average team. And while pass plays in that situation have tended to gain more yardage, when they do run they average nearly six yards. In 16 rushing attempts from that third-down situation, the Terps have gained at least six yards _half the time_, including a 12-yard gain from Roman Hemby earlier in the Illinois game. That's not a huge number of plays, but it puts Maryland among the top 30 teams that have succeeded the most by running on third-and-six since 2018. I've limited my results to teams that have run the ball on third-and-six at least 10 times over this period.

```r
runs_by_team_success <- third_and_six_runs |> filter(yards_gained >= 6) |>  group_by(pos_team)  |> summarise(success = n()) |> arrange(desc(success))

runs_by_team |> inner_join(runs_by_team_success) |> mutate(percent = success/total*100) |> arrange(desc(percent)) |> filter(total >= 10)
```

```text
Joining with `by = join_by(pos_team)`
```

```text
# A tibble: 114 × 4
   pos_team          total success percent
   <chr>             <int>   <int>   <dbl>
 1 Kentucky             12      10    83.3
 2 Coastal Carolina     18      13    72.2
 3 Old Dominion         14      10    71.4
 4 Utah                 15      10    66.7
 5 Oregon State         12       8    66.7
 6 South Florida        20      12    60  
 7 Fresno State         10       6    60  
 8 North Carolina       17      10    58.8
 9 Appalachian State    14       8    57.1
10 UCLA                 14       8    57.1
# … with 104 more rows
```

Maryland's success running on third-and-six isn't quite that of Kentucky, which has done it 10 of 12 times, or even Charlotte (8 of 14 times), who the Terps have beaten twice in a row. But they've succeeded more often than Michigan, Notre Dame and Georgia, to name three Power 5 teams. Still, history would lean towards calling a pass play. Was there something about this particular opponent and situation that made a run more likely?

Let's look at Illinois. Over the past five seasons, the Illini have been pretty good at stopping third-and-six rushes short of a first down, accomplishing that two out of every three attempts.


```r
def_rush <- third_and_six |> 
  filter(str_detect(play_type, "Rush")) |> 
  group_by(def_pos_team) |>
  summarise(total = n()) |> 
  arrange(desc(total))

def_rush_success <- third_and_six |> 
  filter(str_detect(play_type, "Rush")) |> 
  filter(yards_gained >= 6) |>
  group_by(def_pos_team) |>
  summarise(success = n()) |> 
  arrange(desc(success))

def_rush |> 
  inner_join(def_rush_success) |> 
  filter(def_pos_team %in% big_ten) |> 
  mutate(percent = success/total*100) |> 
  arrange(desc(percent)) |> 
  filter(total >= 10)
```

```text
Joining with `by = join_by(def_pos_team)`
```

```text
# A tibble: 11 × 4
   def_pos_team total success percent
   <chr>        <int>   <int>   <dbl>
 1 Ohio State      13       6    46.2
 2 Purdue          11       5    45.5
 3 Indiana         15       6    40  
 4 Maryland        10       4    40  
 5 Wisconsin       14       5    35.7
 6 Illinois        18       6    33.3
 7 Penn State      12       4    33.3
 8 Iowa            18       5    27.8
 9 Northwestern    13       3    23.1
10 Minnesota       10       2    20  
11 Michigan        15       2    13.3
```

But this season has been a different story for a struggling team. How different? Antwain Littleton II's loss of one yard on third-and-six was the first time in four attempts that Illinois didn't give up a first down.


```r
def_rush_2023 <- third_and_six |> 
  filter(str_detect(play_type, "Rush"), season == 2023) |> 
  group_by(def_pos_team) |>
  summarise(total = n()) |> 
  arrange(desc(total))

def_rush_success_2023 <- third_and_six |> 
  filter(str_detect(play_type, "Rush"), season == 2023) |> 
  filter(yards_gained >= 6) |>
  group_by(def_pos_team) |>
  summarise(success = n()) |> 
  arrange(desc(success))

def_rush_2023 |> 
  inner_join(def_rush_success_2023) |> 
  mutate(percent = success/total*100) |> 
  arrange(desc(percent)) 
```

```text
Joining with `by = join_by(def_pos_team)`
```

```text
# A tibble: 125 × 4
   def_pos_team      total success percent
   <chr>             <int>   <int>   <dbl>
 1 Baylor                4       4     100
 2 Akron                 3       3     100
 3 Cal Poly              3       3     100
 4 Bucknell              2       2     100
 5 Duquesne              2       2     100
 6 Georgia Tech          2       2     100
 7 Northern Colorado     2       2     100
 8 Texas Southern        2       2     100
 9 Vanderbilt            2       2     100
10 Weber State           2       2     100
# … with 115 more rows
```

```r
third_and_six |> 
  filter(str_detect(play_type, "Rush"), season == 2023) |> 
  filter(yards_gained < 6, def_pos_team == 'Illinois') |> 
  select(year, pos_team, def_pos_team, period, down, distance, play_type, play_text)
```

```text
────────────────────────────────────────────────────────────── cfbfastR 1.9.0 ──
```

```text
# A tibble: 1 × 8
   year pos_team def_pos_team period  down distance play_type play_text         
  <dbl> <chr>    <chr>         <int> <dbl>    <dbl> <chr>     <chr>             
1  2023 Maryland Illinois          4     3        6 Rush      Antwain Littleton…
```
