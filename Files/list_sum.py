""" Compute the sum of the numbers in a list recursively """

nums = [3, 4, 2]

def list_sum(l):
    
    if len(l) == 0:
        return 0
    else:
        return l[0] + list_sum(l[1:])
    
print(list_sum(nums))